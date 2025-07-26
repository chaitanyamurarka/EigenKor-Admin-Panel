export interface Symbol {
    symbol: string;
    description: string;
    exchange: string;
    securityType: string;
}

export interface IngestedSymbol {
    symbol: string;
    exchange: string;
    description: string;
    securityType: string;
}

export interface SymbolUpdate {
    symbol: string;
    exchange: string;
    description: string;
    securityType: string;
}

export interface SearchParams {
  search_string?: string;
  exchange?: string;
  security_type?: string;
}

export interface SystemConfig {
  schedule_hour: number;
  schedule_minute: number;
  timeframes_to_fetch: Record<string, number>;
}

export interface User {
  id: number;
  username: string;
  password?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
