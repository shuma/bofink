export interface Bank {
  bank: string;
  abbr: string;
  color: string;
  rate: number; // Current rate as percentage
}

export interface BankRate {
  bank: string;
  typ: string;
  rate: number;
}
