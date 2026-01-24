"""
HACCP service.
Business logic for temperature monitoring and food safety compliance.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import calendar
import random
import logging

from app.repositories.temperature_repository import (
    TemperatureRepository,
    EquipmentRepository
)
from app.exceptions import (
    NotFoundError,
    ValidationError
)
from app.models.haccp import (
    TemperatureCreate,
    TemperatureUpdate
)

logger = logging.getLogger(__name__)


class HACCPService:
    """Service for HACCP temperature monitoring operations."""
    
    # Default equipment configurations
    EQUIPMENT_CONFIG = {
        "frigo": {
            "min_temp": 2.0,
            "max_temp": 8.0,
            "default_temp": 5.0
        },
        "freezer": {
            "min_temp": -22.0,
            "max_temp": -18.0,
            "default_temp": -20.0
        },
        "cella": {
            "min_temp": 0.0,
            "max_temp": 4.0,
            "default_temp": 2.0
        }
    }
    
    # Default reading times
    READING_TIMES = ["08:00", "14:00", "20:00"]
    
    def __init__(
        self,
        temperature_repo: TemperatureRepository,
        equipment_repo: EquipmentRepository
    ):
        """
        Initialize HACCP service.
        
        Args:
            temperature_repo: Temperature repository instance
            equipment_repo: Equipment repository instance
        """
        self.temperature_repo = temperature_repo
        self.equipment_repo = equipment_repo
    
    def _generate_realistic_temperature(
        self,
        equipment_type: str,
        variation: float = 1.0
    ) -> float:
        """
        Generate realistic temperature for equipment type.
        
        Args:
            equipment_type: Equipment type
            variation: Temperature variation range
            
        Returns:
            Generated temperature
        """
        config = self.EQUIPMENT_CONFIG.get(equipment_type)
        if not config:
            raise ValidationError(f"Unknown equipment type: {equipment_type}")
        
        base_temp = config["default_temp"]
        # Add small random variation
        temp = base_temp + random.uniform(-variation, variation)
        
        return round(temp, 1)
    
    def _check_compliance(
        self,
        temperature: float,
        equipment_type: str
    ) -> bool:
        """
        Check if temperature is within acceptable range.
        
        Args:
            temperature: Temperature reading
            equipment_type: Equipment type
            
        Returns:
            True if compliant
        """
        config = self.EQUIPMENT_CONFIG.get(equipment_type)
        if not config:
            return True
        
        return config["min_temp"] <= temperature <= config["max_temp"]
    
    async def generate_monthly_records(
        self,
        month: int,
        year: int,
        user_id: str
    ) -> int:
        """
        Generate temperature records for entire month.
        
        Creates 3 readings per day (morning, afternoon, evening) 
        for each equipment type (frigo, freezer, cella).
        
        Args:
            month: Month (1-12)
            year: Year
            user_id: User ID
            
        Returns:
            Number of records created
            
        Raises:
            ValidationError: If month/year invalid
        """
        logger.info(
            f"Generating monthly temperature records for {month:02d}/{year}, "
            f"user: {user_id}"
        )
        
        # Validate month/year
        if not (1 <= month <= 12):
            raise ValidationError("Month must be between 1 and 12")
        
        if not (2020 <= year <= 2100):
            raise ValidationError("Year must be between 2020 and 2100")
        
        # Get number of days in month
        _, num_days = calendar.monthrange(year, month)
        
        equipment_types = ["frigo", "freezer", "cella"]
        created_count = 0
        
        # Generate records for each day
        for day in range(1, num_days + 1):
            reading_date = date(year, month, day)
            
            # Generate 3 readings per day for each equipment
            for equipment_type in equipment_types:
                for reading_time in self.READING_TIMES:
                    
                    # Generate realistic temperature
                    temperature = self._generate_realistic_temperature(
                        equipment_type
                    )
                    
                    # Check compliance
                    is_compliant = self._check_compliance(
                        temperature,
                        equipment_type
                    )
                    
                    # Create temperature record
                    temp_doc = {
                        "user_id": user_id,
                        "equipment_type": equipment_type,
                        "reading_date": reading_date.isoformat(),
                        "reading_time": reading_time,
                        "temperature": temperature,
                        "is_compliant": is_compliant,
                        "created_at": datetime.utcnow()
                    }
                    
                    await self.temperature_repo.create(temp_doc)
                    created_count += 1
        
        logger.info(
            f"✅ Generated {created_count} temperature records for "
            f"{month:02d}/{year}"
        )
        
        return created_count
    
    async def autofill_today(self, user_id: str) -> int:
        """
        Create temperature records for today.
        
        Args:
            user_id: User ID
            
        Returns:
            Number of records created
        """
        logger.info(f"Auto-filling temperature records for today, user: {user_id}")
        
        today = date.today()
        equipment_types = ["frigo", "freezer", "cella"]
        created_count = 0
        
        # Check if records already exist for today
        existing = await self.temperature_repo.find_by_date(
            target_date=today,
            user_id=user_id
        )
        
        if existing:
            logger.warning(f"Records already exist for {today}, skipping autofill")
            return 0
        
        # Generate 3 readings for each equipment
        for equipment_type in equipment_types:
            for reading_time in self.READING_TIMES:
                
                temperature = self._generate_realistic_temperature(equipment_type)
                is_compliant = self._check_compliance(temperature, equipment_type)
                
                temp_doc = {
                    "user_id": user_id,
                    "equipment_type": equipment_type,
                    "reading_date": today.isoformat(),
                    "reading_time": reading_time,
                    "temperature": temperature,
                    "is_compliant": is_compliant,
                    "created_at": datetime.utcnow()
                }
                
                await self.temperature_repo.create(temp_doc)
                created_count += 1
        
        logger.info(f"✅ Auto-filled {created_count} records for {today}")
        
        return created_count
    
    async def create_temperature(
        self,
        temp_data: TemperatureCreate,
        user_id: str
    ) -> str:
        """
        Create a temperature record.
        
        Args:
            temp_data: Temperature data
            user_id: User ID
            
        Returns:
            Created temperature ID
        """
        logger.info(
            f"Creating temperature record: {temp_data.equipment_type} "
            f"on {temp_data.reading_date}"
        )
        
        # Check compliance
        is_compliant = self._check_compliance(
            temp_data.temperature,
            temp_data.equipment_type
        )
        
        temp_doc = temp_data.model_dump()
        temp_doc.update({
            "user_id": user_id,
            "reading_date": temp_data.reading_date.isoformat(),
            "is_compliant": is_compliant,
            "created_at": datetime.utcnow()
        })
        
        temp_id = await self.temperature_repo.create(temp_doc)
        
        logger.info(f"✅ Temperature record created: {temp_id}")
        
        return temp_id
    
    async def get_temperature(self, temp_id: str) -> Dict[str, Any]:
        """
        Get temperature by ID.
        
        Args:
            temp_id: Temperature ID
            
        Returns:
            Temperature record
            
        Raises:
            NotFoundError: If temperature not found
        """
        temp = await self.temperature_repo.find_by_id(temp_id)
        
        if not temp:
            raise NotFoundError("Temperature", temp_id)
        
        return temp
    
    async def list_temperatures(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        equipment_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List temperatures with filters.
        
        Args:
            user_id: User ID
            start_date: Optional start date
            end_date: Optional end date
            equipment_type: Optional equipment type filter
            skip: Number to skip
            limit: Maximum to return
            
        Returns:
            List of temperature records
        """
        if start_date and end_date:
            return await self.temperature_repo.find_by_date_range(
                start_date=start_date,
                end_date=end_date,
                user_id=user_id,
                equipment_type=equipment_type,
                skip=skip,
                limit=limit
            )
        
        if equipment_type:
            return await self.temperature_repo.find_by_equipment(
                equipment_type=equipment_type,
                user_id=user_id,
                skip=skip,
                limit=limit
            )
        
        # All temperatures
        return await self.temperature_repo.find_by_user(
            user_id=user_id,
            skip=skip,
            limit=limit
        )
    
    async def update_temperature(
        self,
        temp_id: str,
        update_data: TemperatureUpdate
    ) -> bool:
        """
        Update temperature record.
        
        Args:
            temp_id: Temperature ID
            update_data: Update data
            
        Returns:
            True if updated
        """
        logger.info(f"Updating temperature: {temp_id}")
        
        # Get existing temperature
        await self.get_temperature(temp_id)
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if not update_dict:
            return True
        
        update_dict["updated_at"] = datetime.utcnow()
        
        return await self.temperature_repo.update(temp_id, update_dict)
    
    async def delete_temperature(self, temp_id: str) -> bool:
        """
        Delete temperature record.
        
        Args:
            temp_id: Temperature ID
            
        Returns:
            True if deleted
        """
        logger.warning(f"Deleting temperature: {temp_id}")
        
        # Verify exists
        await self.get_temperature(temp_id)
        
        return await self.temperature_repo.delete(temp_id)
    
    async def get_statistics(
        self,
        user_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Get temperature statistics for date range.
        
        Args:
            user_id: User ID
            start_date: Start date
            end_date: End date
            
        Returns:
            Statistics dictionary
        """
        temps = await self.temperature_repo.find_by_date_range(
            start_date=start_date,
            end_date=end_date,
            user_id=user_id,
            limit=10000
        )
        
        total = len(temps)
        compliant = sum(1 for t in temps if t.get("is_compliant", True))
        non_compliant = total - compliant
        
        # Group by equipment
        by_equipment = {}
        for temp in temps:
            eq_type = temp.get("equipment_type", "unknown")
            if eq_type not in by_equipment:
                by_equipment[eq_type] = {
                    "total": 0,
                    "compliant": 0,
                    "non_compliant": 0
                }
            
            by_equipment[eq_type]["total"] += 1
            if temp.get("is_compliant", True):
                by_equipment[eq_type]["compliant"] += 1
            else:
                by_equipment[eq_type]["non_compliant"] += 1
        
        return {
            "total_readings": total,
            "compliant_readings": compliant,
            "non_compliant_readings": non_compliant,
            "compliance_percentage": (compliant / total * 100) if total > 0 else 100,
            "by_equipment": by_equipment,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
