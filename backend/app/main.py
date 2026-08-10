from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import Branch, Employee, Parcel
from app.routers.dashboard import router as dashboard_router
from app.routers.branch import router as branch_router
from app.routers.employee import router as employee_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Smart Delivery Management System",
    description="AI-Powered Smart Postal & Courier Delivery Management System",
    version="1.0.0"
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Routers
# ---------------------------------------------------------

app.include_router(dashboard_router)
app.include_router(branch_router)
app.include_router(employee_router)

# ---------------------------------------------------------
# Root
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Smart Delivery Management System API",
        "status": "running"
    }


