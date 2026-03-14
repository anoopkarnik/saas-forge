import '@workspace/ui/globals.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import TRPCProvider from './TRPCProvider'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <TRPCProvider />
    </React.StrictMode>
)
