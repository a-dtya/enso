from fastapi import FastAPI, HTTPException, Depends, status #type: ignore
from fastapi.middleware.cors import CORSMiddleware #type: ignore
from pydantic import BaseModel, EmailStr #type: ignore
import jwt #type: ignore
from jwt import PyJWTError #type: ignore
from starlette.requests import Request #type: ignore
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

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    required_skills: List[str]
    company_id: str

class ProjectMemberAdd(BaseModel):
    profile_id: str

class SkillMatch(BaseModel):
    profile_id: str
    name: str
    role: str
    matching_skills: List[str]
    skill_match_percentage: float

def extract_domain_from_email(email: str) -> str:
    """Extract domain from email address"""
    return email.split('@')[1].lower()

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print("Missing or invalid Authorization header")
        raise HTTPException(status_code=401, detail="Missing token")

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, os.getenv("SUPABASE_JWT_SECRET"), algorithms=["HS256"], options={"verify_aud": False})  # skip audience check
        print("Decoded JWT payload:", payload)
        # Wrap in a simple object so you can use `.id` in endpoints
        class User:
            def __init__(self, sub, email):
                self.id = sub
                self.email = email

        return User(sub=payload["sub"], email=payload.get("email"))
    except PyJWTError as e:
        print("JWT decode error:", e)
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/")
async def root():
    return {"message": "ConnectPro API is running!"}

@app.post("/companies")
async def create_company(company: CompanyCreate):
    # Check if company domain already exists
    existing = supabase.table("companies").select("*").eq("domain", company.domain.lower()).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=409,  # conflict
            detail="Company with this domain already exists"
        )
    
    result = supabase.table("companies").insert({
        "name": company.name,
        "domain": company.domain.lower()
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create company")
    
    return {"company": result.data[0]}

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
            print(f"No company found for domain {email_domain}")
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
            print(f"No profile found for user {user.id}")
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
        
        # Fetch all sent connections
        sent_connections = (
            supabase.table("connections")
            .select("id, requester_id, target_id, status, message, created_at")
            .eq("requester_id", user.id)
            .execute()
        )

        # Fetch profiles for sent connections
        sent_profiles = (
            supabase.table("profiles")
            .select("id, full_name, role, email")
            .in_("id", [conn["target_id"] for conn in sent_connections.data])
            .execute()
        )

        # Combine connections with profile info
        sent = [
            {**conn, "profile": next((p for p in sent_profiles.data if p["id"] == conn["target_id"]), None)}
            for conn in sent_connections.data
        ]

        # Fetch all received connections
        received_connections = (
            supabase.table("connections")
            .select("id, requester_id, target_id, status, message, created_at")
            .eq("target_id", user.id)
            .execute()
        )

        # Fetch profiles for received connections
        received_profiles = (
            supabase.table("profiles")
            .select("id, full_name, role, email")
            .in_("id", [conn["requester_id"] for conn in received_connections.data])
            .execute()
        )

        # Combine connections with profile info
        received = [
            {**conn, "profile": next((p for p in received_profiles.data if p["id"] == conn["requester_id"]), None)}
            for conn in received_connections.data
        ]

        # print(f"Sent connections: {sent}")
        # print(f"Received connections: {received}")

        # Return final result
        return {
            "sent": sent,
            "received": received
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
    
@app.post("/projects")
async def create_project(project: ProjectCreate, user = Depends(get_current_user)):
    # print("Project Details", project)
    result = supabase.table("projects").insert({
        "name": project.name,
        "description": project.description,
        "required_skills": project.required_skills,
        "company_id": project.company_id,
        "created_by": user.id  # Get from auth
    }).execute()
    # print("Project created:", result.data[0])
    return {"project": result.data[0]}

@app.get("/projects/{project_id}/suggested-members")
async def get_project_suggestions(project_id: str):
    # Get project details
    project = supabase.table("projects").select("*").eq("id", project_id).execute()
    required_skills = project.data[0]["required_skills"]
    company_id = project.data[0]["company_id"]
    
    # Get all profiles in company
    profiles = supabase.table("profiles").select("*").eq("company_id", company_id).execute()
    
    suggestions = []
    for profile in profiles.data:
        profile_skills = profile.get("skills", [])
        matching_skills = list(set(required_skills) & set(profile_skills))
        
        if matching_skills:  # Only include if they have at least 1 matching skill
            match_percentage = (len(matching_skills) / len(required_skills)) * 100
            suggestions.append({
                "profile_id": profile["id"],
                "name": profile["full_name"],
                "role": profile["role"],
                "matching_skills": matching_skills,
                "skill_match_percentage": round(match_percentage, 1)
            })
    
    # Sort by match percentage (highest first)
    suggestions.sort(key=lambda x: x["skill_match_percentage"], reverse=True)
    return suggestions

@app.get("/companies/{company_id}/skills-dashboard")
async def get_skills_dashboard(company_id: str):
    profiles = supabase.table("profiles").select("skills, role").eq("company_id", company_id).execute()
    
    # Count skill frequency
    skill_counts = {}
    role_skills = {}
    
    for profile in profiles.data:
        role = profile.get("role", "Unknown")
        skills = profile.get("skills", [])
        
        if role not in role_skills:
            role_skills[role] = {}
            
        for skill in skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1
            role_skills[role][skill] = role_skills[role].get(skill, 0) + 1
    
    return {
        "total_skills": skill_counts,
        "skills_by_role": role_skills,
        "total_employees": len(profiles.data)
    }

@app.post("/projects/{project_id}/members")
async def add_project_member(
    project_id: str,
    member_data: ProjectMemberAdd,
    user = Depends(get_current_user)
):
    """Add a member to a project"""
    try:
        # Verify project exists and user has access
        project = supabase.table("projects").select("company_id, created_by").eq("id", project_id).execute()
        
        if not project.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get current user's profile
        user_profile = supabase.table("profiles").select("company_id").eq("id", user.id).execute()

        if not user_profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Check if user is from same company as project
        if project.data[0]["company_id"] != user_profile.data[0]["company_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if member is already in project
        existing_member = supabase.table("project_members").select("id").eq("project_id", project_id).eq("profile_id", member_data.profile_id).execute()
        
        if existing_member.data:
            raise HTTPException(status_code=400, detail="Member already in project")
        
        # Add member to project
        member_insert = supabase.table("project_members").insert({
            "project_id": project_id,
            "profile_id": member_data.profile_id
        }).execute()
        
        if not member_insert.data:
            raise HTTPException(status_code=400, detail="Failed to add member to project")
        
        return {"success": True, "message": "Member added to project successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/projects/{project_id}/members/{profile_id}")
async def remove_project_member(
    project_id: str,
    profile_id: str,
    user = Depends(get_current_user)
):
    """Remove a member from a project"""
    try:
        # Verify project exists and user has access
        project = supabase.table("projects").select("company_id, created_by").eq("id", project_id).execute()
        
        if not project.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get current user's profile
        user_profile = supabase.table("profiles").select("company_id").eq("id", user.id).execute()

        if not user_profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Check if user is from same company as project
        if project.data[0]["company_id"] != user_profile.data[0]["company_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Remove member from project
        delete_result = supabase.table("project_members").delete().eq("project_id", project_id).eq("profile_id", profile_id).execute()
        
        return {"success": True, "message": "Member removed from project successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/members")
async def get_project_members(
    project_id: str,
    user = Depends(get_current_user)
):
    """Get all members of a project"""
    try:
        # Verify project exists and user has access
        project = supabase.table("projects").select("company_id").eq("id", project_id).execute()
        
        if not project.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get current user's profile
        user_profile = supabase.table("profiles").select("company_id").eq("id", user.id).execute()

        if not user_profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Check if user is from same company as project
        if project.data[0]["company_id"] != user_profile.data[0]["company_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get project members with their profile info
        members = supabase.table("project_members").select("""
            profile_id,
            profiles:profile_id (
                id,
                full_name,
                email,
                role,
                department,
                skills,
                availability_status
            )
        """).eq("project_id", project_id).execute()
        
        # Format response
        member_profiles = []
        for member in members.data:
            if member["profiles"]:
                member_profiles.append(member["profiles"])
        
        return member_profiles
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/company")
async def get_company_projects(user = Depends(get_current_user)):
    # Get user's company and return all projects for that company
    # with member counts and creator names
    user_profile = supabase.table("profiles").select("company_id").eq("id", user.id).execute()
    if not user_profile.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    company_id = user_profile.data[0]["company_id"]

    projects = supabase.table("projects").select(
        "id, name, description, created_at, updated_at, created_by"
    ).eq("company_id", company_id).execute()

    for project in projects.data:
        members = supabase.table("project_members").select("id").eq("project_id", project["id"]).execute()
        project["member_count"] = len(members.data)

        creator_profile = supabase.table("profiles").select("full_name").eq("id", project["created_by"]).execute()
        project["created_by_name"] = creator_profile.data[0]["full_name"] if creator_profile.data else "Unknown"


    return projects.data

if __name__ == "__main__":
    import uvicorn #type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)