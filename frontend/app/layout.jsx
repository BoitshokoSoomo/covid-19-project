import "../css/styles.css";

export const metadata = {
  title: "COVID-19 early outbreak dashboard",
  description: "Explore COVID-19 cases, deaths and recoveries from February to March 2020."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
