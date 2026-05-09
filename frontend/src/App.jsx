import { useAuth } from "@clerk/react"
import PageLoader from "./components/PageLoader";

const App = ()=>{
  const {isLoaded} = useAuth();

  if(!isLoaded) return <PageLoader/>
  return (
    <div>
      <p className="text-4xl text-red-400 font-sans"> Hello </p>
      <button className="btn btn-primary">Click me</button>
      <button className="btn btn-secondary">Click me</button>
      <button className="btn btn-accent">Click me</button>
    </div>
  )
}

export default App