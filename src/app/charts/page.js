
import Script from 'next/script'
import EasyCharts from './easyCharts';

export const metadata = {
  title: 'Lychee: Your Quant in a Box',
  description: 'Stop juggling CSVs, Python scripts, and messy charts. Connect data from Polymarket, manipulate it instantly, generate beautiful dashboards, and act on alpha—all in one browser. Zero coding. Zero friction. Real results.',
  openGraph: {
    url: 'https://lycheedata.com',
    type: 'website',
    title: 'Lychee: Your Quant in a Box',
    description: 'One operator. Full pipeline. Real edge. Stop juggling CSVs, Python scripts, and messy charts. Connect data from Polymarket, manipulate it instantly, generate beautiful dashboards, and act on alpha—all in one browser. Zero coding. Zero friction. Real results.',
    siteName: 'Lychee',
    images: [
      {
        url: 'https://lycheedata.com/ogImage2.png',
        width: 1200,
        height: 630,
        alt: 'Lychee OG Image'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    domain: 'lycheedata.com',
    url: 'https://lycheedata.com',
    title: 'Lychee: Your Quant in a Box',
    description: 'One operator. Full pipeline. Real edge. Stop juggling CSVs, Python scripts, and messy charts. Connect data from Polymarket, manipulate it instantly, generate beautiful dashboards, and act on alpha—all in one browser. Zero coding. Zero friction. Real results.',
    images: ['https://lycheedata.com/ogImage2.png']
  }
};

const charts = () => {  
    return (
      <div>
          <div className='bg-[#0064E6] text-white'>
              <Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>
              <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
            <EasyCharts />              
          </div>
        </div>
    )
}

export default charts