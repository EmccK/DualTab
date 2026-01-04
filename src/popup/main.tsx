/**
 * Popup 入口文件
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Popup } from './Popup'

const rootElement = document.getElementById('popup-root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Popup />
    </StrictMode>,
  )
}
