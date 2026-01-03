"""
Employees router.
API endpoints for employee management, payslips, and health booklets.
"""
from fastapi import APIRouter, Depends, Query, Path, status
from typing import List, Dict, Any, Optional
import logging

from app.database import Database, Collections
from app.repositories.employee_repository import (
    EmployeeRepository,
    PayslipRepository,
    LibrettoSanitarioRepository
)
from app.services.employee_service import EmployeeService
from app.models.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    PayslipCreate,
    PayslipResponse,
    LibrettoSanitarioCreate,
    LibrettoSanitarioUpdate,
    LibrettoSanitarioResponse,
    EmployeeStats
)
from app.utils.dependencies import get_current_user, pagination_params

logger = logging.getLogger(__name__)

router = APIRouter()


# Dependency to get employee service
async def get_employee_service() -> EmployeeService:
    """Get employee service with injected dependencies."""
    db = Database.get_db()
    employee_repo = EmployeeRepository(db[Collections.EMPLOYEES])
    payslip_repo = PayslipRepository(db[Collections.PAYSLIPS])
    libretto_repo = LibrettoSanitarioRepository(db[Collections.LIBRETTI_SANITARI])
    
    return EmployeeService(employee_repo, payslip_repo, libretto_repo)


@router.post(
    "",
    response_model=Dict[str, str],
    status_code=status.HTTP_201_CREATED,
    summary="Create employee",
    description="Create a new employee record"
)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Dict[str, str]:
    """
    Create a new employee.
    
    **Request Body:**
    - **codice_fiscale**: Italian tax code (16 characters, alphanumeric)
    - **first_name**: First name
    - **last_name**: Last name
    - **role**: Job role (cuoco, cameriere, barista, pasticcere, etc.)
    - **hire_date**: Hire date (YYYY-MM-DD)
    - **email**: Optional email
    - **phone**: Optional phone
    - **address**: Optional address
    - **contract_type**: Optional contract type
    - **hourly_rate**: Optional hourly rate
    - **monthly_salary**: Optional monthly salary
    
    **Returns:**
    - Employee ID and success message
    
    **Raises:**
    - 400: If codice fiscale is invalid or already exists
    """
    user_id = current_user["user_id"]
    
    employee_id = await service.create_employee(
        employee_data=employee_data,
        user_id=user_id
    )
    
    return {
        "message": "Employee created successfully",
        "employee_id": employee_id
    }


@router.get(
    "",
    response_model=List[Dict[str, Any]],
    summary="List employees",
    description="Get list of employees with optional filters"
)
async def list_employees(
    current_user: Dict[str, Any] = Depends(get_current_user),
    pagination: Dict[str, Any] = Depends(pagination_params),
    active_only: bool = Query(True, description="Only active employees"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name or CF"),
    service: EmployeeService = Depends(get_employee_service)
) -> List[Dict[str, Any]]:
    """
    List employees with filters.
    
    **Query Parameters:**
    - **skip**: Pagination offset
    - **limit**: Maximum results
    - **active_only**: Only return active employees (default: true)
    - **role**: Filter by job role
    - **search**: Search by name or codice fiscale
    
    **Returns:**
    - List of employee records
    """
    user_id = current_user["user_id"]
    
    return await service.list_employees(
        user_id=user_id,
        skip=pagination["skip"],
        limit=pagination["limit"],
        active_only=active_only,
        role=role,
        search=search
    )


@router.get(
    "/stats",
    response_model=EmployeeStats,
    summary="Get employee statistics",
    description="Get statistics about employees"
)
async def get_employee_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Dict[str, Any]:
    """
    Get employee statistics.
    
    **Returns:**
    - total_employees: Total count
    - active_employees: Active count
    - inactive_employees: Inactive count
    - by_role: Breakdown by role
    - recent_hires: Hires in last 30 days
    - expiring_libretti: Libretti expiring in 30 days
    """
    user_id = current_user["user_id"]
    
    return await service.get_employee_stats(user_id)


@router.get(
    "/{employee_id}",
    response_model=Dict[str, Any],
    summary="Get employee",
    description="Get employee by ID"
)
async def get_employee(
    employee_id: str = Path(..., description="Employee ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Dict[str, Any]:
    """
    Get employee by ID.
    
    **Path Parameters:**
    - **employee_id**: Employee ID
    
    **Returns:**
    - Complete employee record
    
    **Raises:**
    - 404: If employee not found
    """
    return await service.get_employee(employee_id)


@router.put(
    "/{employee_id}",
    status_code=status.HTTP_200_OK,
    summary="Update employee",
    description="Update employee record"
)
async def update_employee(
    employee_id: str = Path(..., description="Employee ID"),
    update_data: EmployeeUpdate = ...,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Dict[str, str]:
    """
    Update employee.
    
    Only provided fields will be updated.
    
    **Path Parameters:**
    - **employee_id**: Employee ID
    
    **Request Body:** (all optional)
    - **first_name**: First name
    - **last_name**: Last name
    - **role**: Job role
    - **email**: Email
    - **phone**: Phone
    - **address**: Address
    - **contract_type**: Contract type
    - **hourly_rate**: Hourly rate
    - **monthly_salary**: Monthly salary
    - **is_active**: Active status
    - **termination_date**: Termination date
    
    **Raises:**
    - 404: If employee not found
    """
    await service.update_employee(
        employee_id=employee_id,
        update_data=update_data
    )
    
    return {"message": "Employee updated successfully"}


@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete employee",
    description="Soft delete employee (set inactive)"
)
async def delete_employee(
    employee_id: str = Path(..., description="Employee ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Dict[str, str]:
    """
    Soft delete employee.
    
    Sets employee as inactive and records termination date.
    
    **Path Parameters:**
    - **employee_id**: Employee ID
    
    **Raises:**
    - 404: If employee not found
    """
    await service.delete_employee(employee_id)
    
    return {"message": "Employee deactivated successfully"}


@router.post(
    "/{employee_id}/payslips",
    response_model=Dict[str, str],
    status_code=status.HTTP_201_CREATED,
    summary="Create payslip",
    description="Upload/create payslip for employee"
)
async def create_payslip(
    employee_id: str = Path(..., description="Employee ID"),
    payslip_data: PayslipCreate = ...,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Dict[str, str]:
    """
    Create payslip for employee.
    
    **Path Parameters:**
    - **employee_id**: Employee ID
    
    **Request Body:**
    - **period**: Period in MM-YYYY format (e.g., "12-2024")
    - **month**: Month (1-12)
    - **year**: Year
    - **gross_salary**: Gross salary (retribuzione lorda)
    - **net_salary**: Net salary (retribuzione netta)
    - **taxes**: Optional taxes withheld
    - **social_security**: Optional social security contributions
    
    **Raises:**
    - 404: If employee not found
    - 400: If payslip already exists for period or net > gross
    """
    user_id = current_user["user_id"]
    
    # Override employee_id in data
    payslip_data.employee_id = employee_id
    
    payslip_id = await service.create_payslip(
        payslip_data=payslip_data,
        user_id=user_id
    )
    
    return {
        "message": "Payslip created successfully",
        "payslip_id": payslip_id
    }


@router.get(
    "/{employee_id}/payslips",
    response_model=List[Dict[str, Any]],
    summary="Get employee payslips",
    description="Get all payslips for employee"
)
async def get_employee_payslips(
    employee_id: str = Path(..., description="Employee ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    pagination: Dict[str, Any] = Depends(pagination_params),
    service: EmployeeService = Depends(get_employee_service)
) -> List[Dict[str, Any]]:
    """
    Get all payslips for employee.
    
    **Path Parameters:**
    - **employee_id**: Employee ID
    
    **Query Parameters:**
    - **skip**: Pagination offset
    - **limit**: Maximum results
    
    **Returns:**
    - List of payslips (newest first)
    
    **Raises:**
    - 404: If employee not found
    """
    user_id = current_user["user_id"]
    
    return await service.get_employee_payslips(
        employee_id=employee_id,
        user_id=user_id,
        skip=pagination["skip"],
        limit=pagination["limit"]
    )


@router.get(
    "/{employee_id}/libretto-sanitario",
    response_model=Optional[Dict[str, Any]],
    summary="Get libretto sanitario",
    description="Get health booklet for employee"
)
async def get_libretto_sanitario(
    employee_id: str = Path(..., description="Employee ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Optional[Dict[str, Any]]:
    """
    Get libretto sanitario for employee.
    
    **Path Parameters:**
    - **employee_id**: Employee ID
    
    **Returns:**
    - Libretto sanitario document or null if not found
    
    **Raises:**
    - 404: If employee not found
    """
    user_id = current_user["user_id"]
    
    return await service.get_libretto_sanitario(
        employee_id=employee_id,
        user_id=user_id
    )


@router.put(
    "/{employee_id}/libretto-sanitario",
    response_model=Dict[str, str],
    status_code=status.HTTP_200_OK,
    summary="Create/update libretto sanitario",
    description="Create or update health booklet for employee"
)
async def upsert_libretto_sanitario(
    employee_id: str = Path(..., description="Employee ID"),
    libretto_data: LibrettoSanitarioCreate = ...,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
) -> Dict[str, str]:
    """
    Create or update libretto sanitario.
    
    **Path Parameters:**
    - **employee_id**: Employee ID
    
    **Request Body:**
    - **issue_date**: Issue date (data rilascio)
    - **expiry_date**: Expiry date (data scadenza)
    - **issuing_authority**: Optional issuing authority
    - **certificate_number**: Optional certificate number
    - **notes**: Optional notes
    
    **Returns:**
    - Libretto ID and success message
    
    **Raises:**
    - 404: If employee not found
    - 400: If expiry_date <= issue_date
    """
    user_id = current_user["user_id"]
    
    # Override employee_id in data
    libretto_data.employee_id = employee_id
    
    libretto_id = await service.upsert_libretto_sanitario(
        employee_id=employee_id,
        libretto_data=libretto_data,
        user_id=user_id
    )
    
    return {
        "message": "Libretto sanitario saved successfully",
        "libretto_id": libretto_id
    }


@router.get(
    "/export/excel",
    summary="Export employees to Excel",
    description="Export employee list to Excel file"
)
async def export_employees_excel(
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service)
):
    """
    Export employees to Excel.
    
    TODO: Implement Excel export with openpyxl
    
    **Returns:**
    - Excel file download
    """
    return {
        "message": "Excel export not yet implemented",
        "note": "Will be implemented in future version"
    }
