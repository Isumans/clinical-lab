from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_patients: int
    todays_appointments: int
    pending_tests: int
    completed_tests: int
