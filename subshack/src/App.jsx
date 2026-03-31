import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [items, setItems] = useState([])

  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase.from('menu_item').select('*')
      if (error) console.error(error)
      else setItems(data)
    }
    fetchItems()
  }, [])

  return (
    <div>
      <h1>SubShack</h1>
      <p>Menu items in DB: {items.length}</p>
    </div>
  )
}

export default App