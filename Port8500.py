"""
Port8500.py - FastAPI Backend for Symbol Management System

This module provides a REST API for managing financial symbols, user authentication,
and system configuration with Redis persistence.
"""

from fastapi import FastAPI, Query, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis
import json
import pandas as pd
from io import StringIO
import asyncio
from concurrent.futures import ProcessPoolExecutor
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
from config.config import settings
from config.logging_config import logger
from typing import Dict, Optional
from datetime import datetime, timedelta, timezone

# Security imports
from passlib.context import CryptContext
from jose import JWTError, jwt

# ==============================================================================
# CONFIGURATION CONSTANTS
# ==============================================================================

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# ==============================================================================
# SECURITY SETUP
# ==============================================================================

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==============================================================================
# DATA MODELS
# ==============================================================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    token_type: Optional[str] = None

class User(BaseModel):
    username: str

class UserInDB(User):
    hashed_password: str

class RefreshTokenData(BaseModel):
    username: str
    refresh_token: str

class SymbolUpdate(BaseModel):
    symbol: str
    exchange: str
    description: str
    securityType: str

class SystemConfig(BaseModel):
    schedule_hour: int = Field(default=20, ge=0, le=23)
    schedule_minute: int = Field(default=1, ge=0, le=59)
    timeframes_to_fetch: Dict[str, int] = Field(default={
        "1s": 7,
        "5s": 7,
        "10s": 7,
        "15s": 7,
        "30s": 7,
        "45s": 7,
        "1m": 180,
        "5m": 180,
        "10m": 180,
        "15m": 180,
        "30m": 180,
        "45m": 180,
        "1h": 180,
        "1d": 720
    })

# ==============================================================================
# AUTHENTICATION HELPERS
# ==============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a plain-text password using Argon2."""
    return pwd_context.hash(password)

def get_user(db: redis.Redis, username: str) -> Optional[UserInDB]:
    """Retrieve user data from Redis."""
    user_data = db.get(f"user:{username}")
    if user_data:
        user_dict = json.loads(user_data)
        return UserInDB(**user_dict)
    return None

def authenticate_user(db: redis.Redis, username: str, password: str) -> Optional[UserInDB]:
    """Authenticate user credentials."""
    user = get_user(db, username)
    if not user:
        logger.warning(f"Authentication failed: User '{username}' not found.")
        return None

    if not verify_password(password, user.hashed_password):
        logger.warning(f"Authentication failed: Invalid password for user '{username}'.")
        return None

    logger.info(f"User '{username}' authenticated successfully.")
    return user

# ==============================================================================
# TOKEN MANAGEMENT
# ==============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """Create a refresh token with longer expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def store_refresh_token(db: redis.Redis, username: str, refresh_token: str) -> None:
    """Store refresh token in Redis with expiration."""
    key = f"refresh_token:{username}"
    db.setex(key, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), refresh_token)

def get_stored_refresh_token(db: redis.Redis, username: str) -> Optional[str]:
    """Get stored refresh token for a user."""
    token = db.get(f"refresh_token:{username}")
    return token.decode('utf-8') if token else None

def revoke_refresh_token(db: redis.Redis, username: str) -> None:
    """Revoke refresh token by deleting it from Redis."""
    db.delete(f"refresh_token:{username}")

def revoke_access_token(db: redis.Redis, token: str) -> None:
    """Add access token to blacklist."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            ttl = exp - int(datetime.now(timezone.utc).timestamp())
            if ttl > 0:
                db.setex(f"blacklist:{token}", ttl, "1")
    except:
        pass  # Invalid token, no need to blacklist

def is_token_blacklisted(db: redis.Redis, token: str) -> bool:
    """Check if token is blacklisted."""
    return bool(db.exists(f"blacklist:{token}"))

# ==============================================================================
# AUTHENTICATION DEPENDENCIES
# ==============================================================================

async def get_current_user(token: str = Depends(oauth2_scheme), db: redis.Redis = Depends(lambda: r)) -> UserInDB:
    """Validate JWT token and return current user."""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if is_token_blacklisted(db, token):
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        logger.warning("JWT Error: Could not validate credentials.")
        raise credentials_exception
    
    user = get_user(db, username=token_data.username)
    if user is None:
        logger.warning(f"Token validation failed: User '{token_data.username}' not found.")
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Return the current authenticated user."""
    return current_user

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

def search_dataframe(df_json: str, search_string: str) -> str:
    """Search DataFrame for symbols matching search criteria."""
    logger.debug(f"Searching DataFrame for string: '{search_string}'")
    df = pd.read_json(StringIO(df_json))
    if search_string:
        search_string_lower = search_string.lower()
        df = df[
            df['symbol'].str.lower().str.contains(search_string_lower) |
            df['description'].str.lower().str.contains(search_string_lower)
        ]
    logger.debug(f"DataFrame search completed. Rows found: {len(df)}")
    return df.to_json(orient='records')

# ==============================================================================
# LIFESPAN MANAGER
# ==============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("Application startup initiated.")
    global r, executor
    
    try:
        REDIS_URL = settings.REDIS_URL
        r = redis.Redis.from_url(REDIS_URL, decode_responses=False)
        r.ping()
        logger.info("Successfully connected to Redis!")
    except redis.exceptions.ConnectionError as e:
        logger.critical(f"Could not connect to Redis: {e}")
        raise RuntimeError(f"Could not connect to Redis: {e}")

    executor = ProcessPoolExecutor()
    logger.info("ProcessPoolExecutor initialized.")

    # Create default admin user if doesn't exist
    if not r.exists("user:admin"):
        logger.info("Admin user not found, creating one...")
        admin_password = settings.ADMIN_PASSWORD
        if not admin_password:
            logger.critical("ADMIN_PASSWORD not set in environment")
            raise RuntimeError("ADMIN_PASSWORD not set in environment")
        
        hashed_password = get_password_hash(admin_password)
        admin_user = UserInDB(username="admin", hashed_password=hashed_password)
        r.set(f"user:{admin_user.username}", admin_user.json())
        logger.info("Default admin user created successfully.")

    yield

    # Shutdown
    executor.shutdown(wait=True)
    logger.info("ProcessPoolExecutor shut down.")
    logger.info("Application shutdown initiated.")

# ==============================================================================
# RATE LIMITING SETUP
# ==============================================================================

limiter = Limiter(key_func=get_remote_address)

# ==============================================================================
# FASTAPI APP INITIALIZATION
# ==============================================================================

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    
    return response

# ==============================================================================
# MIDDLEWARE
# ==============================================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and responses."""
    logger.info(f"Incoming request: {request.method} {request.url} from {request.client.host}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code} for {request.method} {request.url}")
    return response

# ==============================================================================
# AUTHENTICATION ENDPOINTS
# ==============================================================================

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return JWT tokens."""
    logger.info(f"Login attempt for user: {form_data.username}")
    user = authenticate_user(r, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    store_refresh_token(r, user.username, refresh_token)
    
    logger.info(f"Access token created for user: {user.username}")
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    token: str = Depends(oauth2_scheme)
):
    """Logout user by revoking tokens."""
    revoke_refresh_token(r, current_user.username)
    revoke_access_token(r, token)
    return {"message": "Logged out successfully"}

@app.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token using valid refresh token."""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        
        if username is None or payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        stored_token = get_stored_refresh_token(r, username)
        if stored_token != refresh_token:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        access_token = create_access_token(data={"sub": username})
        new_refresh_token = create_refresh_token(data={"sub": username})
        store_refresh_token(r, username, new_refresh_token)
        
        return {"access_token": access_token, "refresh_token": new_refresh_token}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user information."""
    return current_user

# ==============================================================================
# SYMBOL MANAGEMENT ENDPOINTS
# ==============================================================================

@app.get("/get_ingestion_symbols/")
async def get_ingestion_symbols():
    """Get current list of symbols being ingested."""
    logger.info("Received request to get ingestion symbols.")
    try:
        symbols_json = r.get("dtn:ingestion:symbols")
        if symbols_json:
            symbols = json.loads(symbols_json)
            logger.info(f"Found {len(symbols)} ingestion symbols in Redis.")
            return symbols
        else:
            logger.info("No ingestion symbols found in Redis.")
            return []
    except Exception as e:
        logger.error(f"Failed to get ingestion symbols: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get ingestion symbols: {e}")

@app.post("/set_ingestion_symbols/")
async def set_ingestion_symbols(symbols: list[SymbolUpdate]):
    """Set complete list of symbols to be ingested (overwrites existing)."""
    logger.info(f"Received request to set ingestion symbols. Payload: {len(symbols)} symbols.")
    try:
        symbols_data = [s.dict() for s in symbols]
        r.set("dtn:ingestion:symbols", json.dumps(symbols_data))
        r.publish("dtn:ingestion:symbol_updates", "symbols_updated")
        logger.info("Ingestion symbols set successfully.")
        return {"message": "Ingestion symbols set successfully"}
    except Exception as e:
        logger.error(f"Failed to set ingestion symbols: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to set ingestion symbols: {e}")

@app.post("/add_ingestion_symbol/")
async def add_ingestion_symbol(symbol_data: SymbolUpdate):
    """Add a single symbol to the ingestion list."""
    logger.info(f"Received request to add symbol: {symbol_data.symbol} ({symbol_data.exchange})")
    try:
        current_symbols_json = r.get("dtn:ingestion:symbols")
        current_symbols = json.loads(current_symbols_json) if current_symbols_json else []

        new_symbol = symbol_data.dict()
        symbol_exists = any(
            s['symbol'] == new_symbol['symbol'] and s['exchange'] == new_symbol['exchange']
            for s in current_symbols
        )

        if not symbol_exists:
            current_symbols.append(new_symbol)
            r.set("dtn:ingestion:symbols", json.dumps(current_symbols))
            r.publish("dtn:ingestion:symbol_updates", "symbols_updated")
            logger.info(f"Symbol added successfully. Total: {len(current_symbols)}")
            return {"message": f"Symbol {symbol_data.symbol} added successfully."}
        else:
            logger.info(f"Symbol already exists. Skipping.")
            return {"message": f"Symbol already exists.", "status": "skipped"}
    except Exception as e:
        logger.error(f"Failed to add ingestion symbol: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add ingestion symbol: {e}")

@app.post("/remove_ingestion_symbol/")
async def remove_ingestion_symbol(symbol_data: SymbolUpdate):
    """Remove a single symbol from the ingestion list."""
    logger.info(f"Received request to remove symbol: {symbol_data.symbol} ({symbol_data.exchange})")
    try:
        current_symbols_json = r.get("dtn:ingestion:symbols")
        current_symbols = json.loads(current_symbols_json) if current_symbols_json else []

        symbol_to_remove = symbol_data.dict()
        new_symbols = [
            s for s in current_symbols
            if not (s['symbol'] == symbol_to_remove['symbol'] and s['exchange'] == symbol_to_remove['exchange'])
        ]

        if len(new_symbols) < len(current_symbols):
            r.set("dtn:ingestion:symbols", json.dumps(new_symbols))
            r.publish("dtn:ingestion:symbol_updates", "symbols_updated")
            logger.info(f"Symbol removed successfully. Total: {len(new_symbols)}")
            return {"message": f"Symbol {symbol_data.symbol} removed successfully."}
        else:
            logger.info(f"Symbol not found. Nothing to remove.")
            return {"message": f"Symbol not found.", "status": "not_found"}
    except Exception as e:
        logger.error(f"Failed to remove ingestion symbol: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to remove ingestion symbol: {e}")

# ==============================================================================
# SEARCH ENDPOINTS
# ==============================================================================

@app.get("/search_symbols/")
async def search_symbols(
    search_string: str = Query(None, description="Search string for symbol or description"),
    exchange: str = Query(None, description="Filter by exchange (e.g., NYSE, CME)"),
    security_type: str = Query(None, description="Filter by security type (e.g., STOCK, FUTURES)")
):
    """Search for symbols with optional filtering."""
    logger.info(f"Search request: '{search_string}', Exchange: '{exchange}', Type: '{security_type}'")
    
    all_keys = r.keys("symbols:*:*")
    filtered_keys = []
    
    for key in all_keys:
        decoded_key = key.decode('utf-8')
        parts = decoded_key.split(':')
        key_exchange, key_security_type = parts[1], parts[2]

        exchange_match = not exchange or key_exchange.lower() == exchange.lower()
        security_type_match = not security_type or key_security_type.lower() == security_type.lower()

        if exchange_match and security_type_match:
            filtered_keys.append(key)

    if not filtered_keys:
        return []

    all_dfs_json_strings = []
    for key in filtered_keys:
        value_bytes = r.get(key)
        if value_bytes:
            all_dfs_json_strings.append(value_bytes.decode('utf-8'))

    if not all_dfs_json_strings:
        return []

    loop = asyncio.get_running_loop()
    search_tasks = [
        loop.run_in_executor(executor, search_dataframe, df_json_str, search_string)
        for df_json_str in all_dfs_json_strings
    ]

    results_json = await asyncio.gather(*search_tasks)
    
    combined_df = pd.DataFrame()
    for res_json in results_json:
        if res_json:
            try:
                if len(json.loads(res_json)) > 0:
                    res_df = pd.read_json(StringIO(res_json))
                    combined_df = pd.concat([combined_df, res_df], ignore_index=True)
            except (json.JSONDecodeError, pd.errors.EmptyDataError):
                logger.warning(f"Could not decode empty JSON: {res_json}")
                continue

    if not combined_df.empty:
        combined_df.drop_duplicates(subset=['symbol', 'exchange', 'securityType'], inplace=True)

    logger.info(f"Search completed. Found {len(combined_df)} unique symbols")
    return combined_df.to_dict(orient='records')

# ==============================================================================
# SYSTEM CONFIGURATION ENDPOINTS
# ==============================================================================

@app.get("/get_system_config/")
async def get_system_config():
    """Get current system configuration for data ingestion."""
    logger.info("Received request to get system config.")
    try:
        config_json = r.get("dtn:system:config")
        if config_json:
            config = json.loads(config_json)
            logger.info("Found system config in Redis.")
            return config
        else:
            logger.info("No system config found, returning defaults.")
            return SystemConfig().dict()
    except Exception as e:
        logger.error(f"Failed to get system config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get system config: {e}")

@app.post("/set_system_config/")
async def set_system_config(config: SystemConfig):
    """Set system configuration for data ingestion."""
    logger.info(f"Received request to set system config: {config.dict()}")
    try:
        config_data = config.dict()
        r.set("dtn:system:config", json.dumps(config_data))
        r.publish("dtn:system:config_updates", "config_updated")
        logger.info("System config set successfully.")
        return {"message": "System config set successfully"}
    except Exception as e:
        logger.error(f"Failed to set system config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to set system config: {e}")

# ==============================================================================
# APPLICATION ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    logger.info("Starting Uvicorn server...")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8500, log_level="info")
    logger.info("Uvicorn server stopped.")
