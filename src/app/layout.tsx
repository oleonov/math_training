import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// Distinctive, rounded, kid-friendly type. Fredoka carries the big numbers;
// Nunito (with Cyrillic) handles all UI text.
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
});

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

const SITE_URL = "https://math.pandorika-it.com";
const SITE_NAME = "Таблица умножения";
const DESCRIPTION =
  "Бесплатный онлайн-тренажёр таблицы умножения для детей. Умные карточки " +
  "запоминают, какие примеры даются труднее, и подбирают их чаще — так ребёнок " +
  "быстрее выучивает таблицу умножения от 2 до 9. Можно заниматься сразу, как " +
  "гость, без регистрации.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Тренажёр таблицы умножения для детей — учим умножение онлайн",
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  category: "education",
  keywords: [
    "таблица умножения",
    "тренажёр таблицы умножения",
    "выучить таблицу умножения",
    "умножение для детей",
    "математика для детей",
    "устный счёт",
    "таблица умножения онлайн",
    "тренажёр умножения",
  ],
  authors: [{ name: "Pandorika" }],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Тренажёр таблицы умножения для детей",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Тренажёр таблицы умножения для детей",
    description:
      "Умные карточки помогают ребёнку быстро выучить таблицу умножения. " +
      "Можно начать сразу, как гость, без регистрации.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: SITE_URL },
};

// Structured data (schema.org) so search engines can show a rich result for the
// trainer as a free educational web app.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "ru-RU",
  isAccessibleForFree: true,
  audience: { "@type": "EducationalAudience", educationalRole: "student" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
};

export const viewport: Viewport = {
  themeColor: "#2f6df6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
