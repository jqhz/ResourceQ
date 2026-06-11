import "@src/styles/globals.css";
import ThemeRegistry from "@src/components/ThemeRegistry";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex-col flex vc-init">
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
