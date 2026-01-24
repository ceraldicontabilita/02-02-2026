"""
HACCP models.
Temperature monitoring and equipment management for food safety compliance.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, date as date_type


class Temperature(BaseModel):
    """Temperature reading for HACCP compliance."""
    
    id: Optional[str] = Field(None, alias="_id")
    user_id: str = Field(default="admin")
    
    equipment_type: str = Field(
        ...,
        description="Equipment type: frigo, freezer, cella"
    )
    equipment_name: Optional[str] = Field(
        None,
        description="Custom equipment name"
    )
    
    reading_date: date_type = Field(..., description="Date of reading")
    reading_time: str = Field(..., description="Time in HH:MM format")
    temperature: float = Field(..., description="Temperature in Celsius")
    
    is_compliant: bool = Field(
        default=True,
        description="Whether temperature is within acceptable range"
    )
    notes: Optional[str] = Field(None, description="Optional notes")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(populate_by_name=True)


class TemperatureCreate(BaseModel):
    """Temperature creation request."""
    
    equipment_type: str = Field(
        ...,
        description="Equipment type: frigo, freezer, cella"
    )
    equipment_name: Optional[str] = None
    reading_date: date_type
    reading_time: str = Field(..., description="HH:MM format")
    temperature: float
    notes: Optional[str] = None


class TemperatureUpdate(BaseModel):
    """Temperature update request."""
    
    temperature: Optional[float] = None
    notes: Optional[str] = None
    is_compliant: Optional[bool] = None


class TemperatureResponse(BaseModel):
    """Temperature response model."""
    
    id: str
    user_id: str
    equipment_type: str
    equipment_name: Optional[str]
    reading_date: date_type
    reading_time: str
    temperature: float
    is_compliant: bool
    notes: Optional[str]
    created_at: datetime


class Equipment(BaseModel):
    """HACCP equipment configuration."""
    
    id: Optional[str] = Field(None, alias="_id")
    user_id: str = Field(default="admin")
    
    type: str = Field(
        ...,
        description="Equipment type: frigo, freezer, cella"
    )
    name: str = Field(..., description="Equipment name")
    location: Optional[str] = Field(None, description="Physical location")
    
    min_temp: float = Field(..., description="Minimum acceptable temperature")
    max_temp: float = Field(..., description="Maximum acceptable temperature")
    
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(populate_by_name=True)


class EquipmentCreate(BaseModel):
    """Equipment creation request."""
    
    type: str
    name: str
    location: Optional[str] = None
    min_temp: float
    max_temp: float


class EquipmentUpdate(BaseModel):
    """Equipment update request."""
    
    name: Optional[str] = None
    location: Optional[str] = None
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    is_active: Optional[bool] = None


class EquipmentResponse(BaseModel):
    """Equipment response model."""
    
    id: str
    user_id: str
    type: str
    name: str
    location: Optional[str]
    min_temp: float
    max_temp: float
    is_active: bool
    created_at: datetime


class GenerateMonthlyRequest(BaseModel):
    """Request to generate monthly temperature records."""
    
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    year: int = Field(..., ge=2020, le=2100, description="Year")


class TemperatureStats(BaseModel):
    """Temperature statistics."""
    
    total_readings: int
    compliant_readings: int
    non_compliant_readings: int
    compliance_percentage: float
    by_equipment: dict
    date_range: dict


class OilTest(BaseModel):
    """Oil quality test for fryer (friggitrice)."""
    
    id: Optional[str] = Field(None, alias="_id")
    user_id: str = Field(default="admin")
    
    test_date: date_type
    test_time: str = Field(..., description="HH:MM format")
    
    oil_type: str = Field(..., description="Type of oil used")
    test_result: str = Field(
        ...,
        description="Test result: OK, WARNING, CHANGE"
    )
    test_value: Optional[float] = Field(
        None,
        description="Test strip value if applicable"
    )
    
    action_taken: Optional[str] = Field(
        None,
        description="Action taken if oil needs change"
    )
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(populate_by_name=True)


class OilTestCreate(BaseModel):
    """Oil test creation request."""
    
    test_date: date_type
    test_time: str
    oil_type: str
    test_result: str
    test_value: Optional[float] = None
    action_taken: Optional[str] = None
    notes: Optional[str] = None


class Sanification(BaseModel):
    """Sanification record."""
    
    id: Optional[str] = Field(None, alias="_id")
    user_id: str = Field(default="admin")
    
    sanification_date: date_type
    sanification_time: str = Field(..., description="HH:MM format")
    
    area: str = Field(..., description="Area sanitized")
    product_used: str = Field(..., description="Sanitization product")
    
    performed_by: str = Field(..., description="Person who performed sanification")
    verified_by: Optional[str] = Field(None, description="Person who verified")
    
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(populate_by_name=True)


class SanificationCreate(BaseModel):
    """Sanification creation request."""
    
    sanification_date: date_type
    sanification_time: str
    area: str
    product_used: str
    performed_by: str
    verified_by: Optional[str] = None
    notes: Optional[str] = None
