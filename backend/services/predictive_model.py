"""Predictive pricing model - to be implemented in Step 2"""

class PredictiveModel:
    def train(self, df):
        raise NotImplementedError

    def predict(self, features: dict) -> dict:
        raise NotImplementedError
