
export default function SelectModule() {
  
  return (
    <div style={{ padding: 40 }}>
      <h1>GrowthGrid</h1>
      <p>Select the business system you want to open</p>

      
        <div style={{ display: "flex", gap: 20, marginTop: 30 }}>
            <button onClick={() => (window.location.href = "/owner-dashboard")}>
            Hermanus Gas (Owner)
        </button>

        <button onClick={() => (window.location.href = "/clerk-dashboard")}>
          Hermanus Gas (Clerk)
        </button>

        <button onClick={() => (window.location.href = "/motor/owner")}>
          Motor Sales System
        </button>
      </div>
      </div>
     
)}