import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// la página aparece con un fundido cuando las tipografías están listas; si tardan demasiado se muestra igual
const reveal = () => document.documentElement.classList.add('ready')
const sample = 'Menos peso. La misma imagen. áéíóúñ ¿?'
Promise.race([
  Promise.all([
    document.fonts.load('800 1em "Bricolage Grotesque Variable"', sample),
    document.fonts.load('400 1em "Instrument Sans Variable"', sample),
    document.fonts.load('600 1em "Instrument Sans Variable"', sample),
  ]),
  new Promise((ok) => setTimeout(ok, 1800)),
]).then(reveal, reveal)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
