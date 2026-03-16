"""KPI computation engine - to be implemented in Step 2"""

class KPIEngine:
    def __init__(self, df):
        self.df = df

    def compute_snapshot(self, district: str) -> dict:
        raise NotImplementedError
