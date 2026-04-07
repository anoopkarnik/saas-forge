import '@workspace/ui/globals.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import TRPCProvider from './TRPCProvider'

const themeColor = import.meta.env.VITE_THEME || 'green';
const html = document.documentElement;
Array.from(html.classList).forEach((className) => {
    if (className.startsWith('theme-')) {
        html.classList.remove(className);
    }
});
html.classList.add(`theme-${themeColor}`);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <TRPCProvider />
    </React.StrictMode>
)
