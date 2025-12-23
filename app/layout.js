import './globals.css'

export const metadata = {
  title: 'Prompt Optimiser',
  description: 'Analyse and optimise prompts for Claude, GPT-5.2, Gemini 3, and Microsoft Copilot',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  )
}
