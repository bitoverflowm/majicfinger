import Nav from '@/components/nav';
import { Metadata } from 'next';
import './globals.css'
 
export const metadata = {
  title: 'Lychee',
  description: 'Analyze and Visualize Data. Without Spreadsheets.',
  custom: [
    { name: '_foundr', content: '1e04ca29b3242af44ee799e756cfafce' },
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        <head /> will contain the components returned by the nearest parent
        head.js. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
      
      <body>
        <Nav/>
        <div className='-mt-16'>
          {children}
        </div>
      </body>
    </html>
  )
}
