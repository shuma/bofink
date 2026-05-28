import { Bank, BankRate } from "@/types/bank";

export const banks: Bank[] = [
  { bank: "Swedbank", abbr: "SWE", color: "#FF6600", rate: 3.89 },
  { bank: "Handelsbanken", abbr: "SHB", color: "#003366", rate: 3.85 },
  { bank: "SEB", abbr: "SEB", color: "#379B45", rate: 3.92 },
  { bank: "Nordea", abbr: "NDA", color: "#0000FF", rate: 3.88 },
  { bank: "Länsförsäkringar", abbr: "LF", color: "#E4002B", rate: 3.79 },
  { bank: "Danske Bank", abbr: "DB", color: "#003755", rate: 3.95 },
  { bank: "SBAB", abbr: "SBAB", color: "#00A3E0", rate: 3.69 },
  { bank: "Skandia", abbr: "SKA", color: "#6D2077", rate: 3.75 },
];

export const bankRates: BankRate[] = [
  // SBAB
  { bank: "SBAB", typ: "rörlig", rate: 3.69 },
  { bank: "SBAB", typ: "1 år", rate: 3.49 },
  { bank: "SBAB", typ: "3 år", rate: 3.29 },
  { bank: "SBAB", typ: "5 år", rate: 3.19 },
  // Skandia
  { bank: "Skandia", typ: "rörlig", rate: 3.75 },
  { bank: "Skandia", typ: "1 år", rate: 3.55 },
  { bank: "Skandia", typ: "3 år", rate: 3.35 },
  { bank: "Skandia", typ: "5 år", rate: 3.25 },
  // Länsförsäkringar
  { bank: "Länsförsäkringar", typ: "rörlig", rate: 3.79 },
  { bank: "Länsförsäkringar", typ: "1 år", rate: 3.59 },
  { bank: "Länsförsäkringar", typ: "3 år", rate: 3.39 },
  { bank: "Länsförsäkringar", typ: "5 år", rate: 3.29 },
  // Handelsbanken
  { bank: "Handelsbanken", typ: "rörlig", rate: 3.85 },
  { bank: "Handelsbanken", typ: "1 år", rate: 3.65 },
  { bank: "Handelsbanken", typ: "3 år", rate: 3.45 },
  { bank: "Handelsbanken", typ: "5 år", rate: 3.35 },
  // Nordea
  { bank: "Nordea", typ: "rörlig", rate: 3.88 },
  { bank: "Nordea", typ: "1 år", rate: 3.68 },
  { bank: "Nordea", typ: "3 år", rate: 3.48 },
  { bank: "Nordea", typ: "5 år", rate: 3.38 },
  // Swedbank
  { bank: "Swedbank", typ: "rörlig", rate: 3.89 },
  { bank: "Swedbank", typ: "1 år", rate: 3.69 },
  { bank: "Swedbank", typ: "3 år", rate: 3.49 },
  { bank: "Swedbank", typ: "5 år", rate: 3.39 },
  // SEB
  { bank: "SEB", typ: "rörlig", rate: 3.92 },
  { bank: "SEB", typ: "1 år", rate: 3.72 },
  { bank: "SEB", typ: "3 år", rate: 3.52 },
  { bank: "SEB", typ: "5 år", rate: 3.42 },
  // Danske Bank
  { bank: "Danske Bank", typ: "rörlig", rate: 3.95 },
  { bank: "Danske Bank", typ: "1 år", rate: 3.75 },
  { bank: "Danske Bank", typ: "3 år", rate: 3.55 },
  { bank: "Danske Bank", typ: "5 år", rate: 3.45 },
];

export function getBankColor(bankName: string): string {
  const bank = banks.find((b) => b.bank === bankName);
  return bank?.color ?? "#888888";
}

export function getBankRate(bankName: string, typ: string): number | undefined {
  const rate = bankRates.find((r) => r.bank === bankName && r.typ === typ);
  return rate?.rate;
}
