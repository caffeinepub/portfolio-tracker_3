import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Currency = "USD" | "CAD" | "EUR" | "GBP" | "JPY" | "PHP";

const STORAGE_KEY = "portfolio_currency";

const FALLBACK_RATES: Record<Exclude<Currency, "USD">, number> = {
  CAD: 1.36,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  PHP: 56.5,
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: "en-US",
  CAD: "en-CA",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  PHP: "fil-PH",
};

const CURRENCY_FRACTION_DIGITS: Record<Currency, number> = {
  USD: 2,
  CAD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  PHP: 2,
};

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<Exclude<Currency, "USD">, number>;
  fmtCurrency: (val: number) => string;
  currencySymbol: string;
  /** @deprecated use fmtCurrency */
  cadRate: number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Currency | null;
    const valid: Currency[] = ["USD", "CAD", "EUR", "GBP", "JPY", "PHP"];
    return stored && valid.includes(stored) ? stored : "USD";
  });

  const [rates, setRates] =
    useState<Record<Exclude<Currency, "USD">, number>>(FALLBACK_RATES);

  // Fetch all live rates from USD in one call
  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD&to=CAD,EUR,GBP,JPY,PHP")
      .then((res) => {
        if (!res.ok) throw new Error("Bad response");
        return res.json();
      })
      .then(
        (data: {
          rates?: Partial<Record<Exclude<Currency, "USD">, number>>;
        }) => {
          if (data?.rates) {
            setRates((prev) => ({ ...prev, ...data.rates }));
          }
        },
      )
      .catch(() => {
        // Silently fall back to hardcoded rates
      });
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    localStorage.setItem(STORAGE_KEY, c);
    setCurrencyState(c);
  }, []);

  const fmtCurrency = useCallback(
    (val: number): string => {
      const converted =
        currency === "USD"
          ? val
          : val * rates[currency as Exclude<Currency, "USD">];
      const fractionDigits = CURRENCY_FRACTION_DIGITS[currency];
      return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(converted);
    },
    [currency, rates],
  );

  const currencySymbol =
    currency === "EUR"
      ? "€"
      : currency === "GBP"
        ? "£"
        : currency === "JPY"
          ? "¥"
          : currency === "PHP"
            ? "₱"
            : "$";

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        fmtCurrency,
        currencySymbol,
        cadRate: rates.CAD,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}
