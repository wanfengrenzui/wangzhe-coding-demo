import "./globals.css";

export const metadata = {
  title: "峡谷 AI 内容工作台",
  description: "王者荣耀 AI 内容与模型评估内部工作台 demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
