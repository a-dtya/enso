from fastapi import FastAPI, HTTPException, Depends, status #type: ignore
from fastapi.middleware.cors import CORSMiddleware #type: ignore
from pydantic import BaseModel, EmailStr #type: ignore
from typing import List, Optional
import os
from dotenv import load_dotenv #type: ignore
from supabase import create_client, Client #type: ignore
import re

load_dotenv()

app = FastAPI(title="ConnectPro API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase setup
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

# Pydantic models
class CompanyCreate(BaseModel):
    name: str
    domain: str

class ProfileCreate(BaseModel):
    full_name: str
    email: EmailStr
    role: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    availability_status: Optional[str] = None

class ConnectionRequest(BaseModel):
    target_id: str
    message: Optional[str] = None

class ConnectionUpdate(BaseModel):
    status: str  # accepted, declined

def extract_domain_from_email(email: str) -> str:
    """Extract domain from email address"""
    return email.split('@')[1].lower()

def get_current_user(authorization: str = None):
    """Get current user from authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return user.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

@app.get("/")
async def root():
    return {"message": "ConnectPro API is running!"}

@app.post("/companies")
async def create_company(company: CompanyCreate):
    """Create a new company"""
    try:
        # Check if company domain already exists
        existing = supabase.table("companies").select("*").eq("domain", company.domain.lower()).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=400,
                detail="Company with this domain already exists"
            )
        
        result = supabase.table("companies").insert({
            "name": company.name,
            "domain": company.domain.lower()
        }).execute()
        
        return {"message": "Company created successfully", "company": result.data[0]}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies/by-domain/{domain}")
async def get_company_by_domain(domain: str):
    """Get company by domain"""
    try:
        result = supabase.table("companies").select("*").eq("domain", domain.lower()).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/profiles")
async def create_profile(profile: ProfileCreate, user = Depends(get_current_user)):
    """Create user profile"""
    try:
        # Extract domain from email
        email_domain = extract_domain_from_email(profile.email)
        
        # Find company by domain
        company_result = supabase.table("companies").select("*").eq("domain", email_domain).execute()
        
        if not company_result.data:
            raise HTTPException(
                status_code=400,
                detail=f"No company found for domain {email_domain}. Please ask your admin to register your company first."
            )
        
        company = company_result.data[0]
        
        # Create profile
        profile_data = {
            "id": user.id,
            "company_id": company["id"],
            "full_name": profile.full_name,
            "email": profile.email,
            "role": profile.role,
            "department": profile.department,
            "bio": profile.bio,
            "skills": profile.skills
        }
        
        result = supabase.table("profiles").insert(profile_data).execute()
        
        return {"message": "Profile created successfully", "profile": result.data[0]}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/profiles/me")
async def get_my_profile(user = Depends(get_current_user)):
    """Get current user's profile"""
    try:
        result = supabase.table("profiles").select("*, companies(name, domain)").eq("id", user.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/profiles/me")
async def update_my_profile(profile_update: ProfileUpdate, user = Depends(get_current_user)):
    """Update current user's profile"""
    try:
        update_data = {k: v for k, v in profile_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        result = supabase.table("profiles").update(update_data).eq("id", user.id).execute()
        
        return {"message": "Profile updated successfully", "profile": result.data[0]}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/profiles")
async def search_profiles(q: Optional[str] = None, user = Depends(get_current_user)):
    """Search profiles in the same company"""
    try:
        # Get user's company
        user_profile = supabase.table("profiles").select("company_id").eq("id", user.id).execute()
        
        if not user_profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        company_id = user_profile.data[0]["company_id"]
        
        # Build query
        query = supabase.table("profiles").select("*").eq("company_id", company_id).neq("id", user.id)
        
        # Add search filter if provided
        if q:
            # This is a simple search - in production you'd want better full-text search
            result = query.execute()
            
            # Filter results based on search term
            filtered_results = []
            search_term = q.lower()
            
            for profile in result.data:
                # Search in name, role, department, bio, and skills
                searchable_text = f"{profile.get('full_name', '')} {profile.get('role', '')} {profile.get('department', '')} {profile.get('bio', '')} {' '.join(profile.get('skills', []))}".lower()
                
                if search_term in searchable_text:
                    filtered_results.append(profile)
            
            return filtered_results
        else:
            result = query.execute()
            return result.data
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/profiles/{profile_id}")
async def get_profile(profile_id: str, user = Depends(get_current_user)):
    """Get specific profile"""
    try:
        # Get user's company
        user_profile = supabase.table("profiles").select("company_id").eq("id", user.id).execute()
        company_id = user_profile.data[0]["company_id"]
        
        # Get target profile (must be in same company)
        result = supabase.table("profiles").select("*").eq("id", profile_id).eq("company_id", company_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/connections")
async def create_connection_request(connection: ConnectionRequest, user = Depends(get_current_user)):
    """Create a connection request"""
    try:
        connection_data = {
            "requester_id": user.id,
            "target_id": connection.target_id,
            "message": connection.message,
            "status": "pending"
        }
        #check if already connection request sent
        existing_request = supabase.table("connections").select("*").eq("requester_id", user.id).eq("target_id", connection.target_id).execute()
        if existing_request.data:
            raise HTTPException(status_code=400, detail="Connection request already sent")

        result = supabase.table("connections").insert(connection_data).execute()
        
        return {"message": "Connection request sent", "connection": result.data[0]}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/connections")
async def get_my_connections(user = Depends(get_current_user)):
    """Get all connections for current user"""
    try:
        # Get sent requests
        sent = supabase.table("connections").select("*, profiles!connections_target_id_fkey(full_name, role, email)").eq("requester_id", user.id).execute()
        
        # Get received requests
        received = supabase.table("connections").select("*, profiles!connections_requester_id_fkey(full_name, role, email)").eq("target_id", user.id).execute()
        
        return {
            "sent": sent.data,
            "received": received.data
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/connections/{connection_id}")
async def update_connection(connection_id: str, connection_update: ConnectionUpdate, user = Depends(get_current_user)):
    """Update connection status (accept/decline)"""
    try:
        # Verify user is the target of this connection
        connection_check = supabase.table("connections").select("*").eq("id", connection_id).eq("target_id", user.id).execute()
        
        if not connection_check.data:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        result = supabase.table("connections").update({"status": connection_update.status}).eq("id", connection_id).execute()
        
        return {"message": "Connection updated", "connection": result.data[0]}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn #type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)