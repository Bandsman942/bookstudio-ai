import './styles.css';
import type {Metadata} from 'next';
import type {ReactNode} from 'react';
export const metadata:Metadata={title:'BookStudio AI by DTSC',description:'Atelier éditorial intelligent et privé.'};
export default function RootLayout({children}:{children:ReactNode}) {return <html lang="fr"><body>{children}</body></html>;}
