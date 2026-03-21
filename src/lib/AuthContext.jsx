import{createContext,useContext,useEffect,useState}from'react'
import{supabase,getProfile}from'./supabase'

const AuthContext=createContext(null)

export function AuthProvider({children}){
  const[session,setSession]=useState(null)
  const[profile,setProfile]=useState(null)
  const[loading,setLoading]=useState(true)

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);if(session?.user)loadProfile(session.user.id);else setLoading(false)})
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setSession(session);if(session?.user)loadProfile(session.user.id);else{setProfile(null);setLoading(false)}})
    return()=>subscription.unsubscribe()
  },[])

  async function loadProfile(userId){try{const p=await getProfile(userId);setProfile(p)}catch{setProfile(null)}finally{setLoading(false)}}

  return <AuthContext.Provider value={{session,profile,loading,isAdmin:profile?.role==='admin',refresh:()=>session&&loadProfile(session.user.id)}}>{children}</AuthContext.Provider>
}

export const useAuth=()=>useContext(AuthContext)
