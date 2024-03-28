//import Nav from '@/components/nav';
import './globals.css'

//import { StateProvider } from '@/context/stateContext'
 
export const metadata = {
  title: 'Lychee',
  description: 'Analyze and Visualize Data. Without Spreadsheets.',
  verification: {
    other: { _foundr: ['973f2a49e12fad2ad799756c823a6d3b'] },
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        <head /> will contain the components returned by the nearest parent
        head.js. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
      <body>
        <div className=''>
          {children}
        </div>
      </body>
    </html>
  )
}
