import unittest
from datetime import date

from server import app, db, User, UserTierSchedule, Demos, SalesHours, PayPeriod, compute_daily_pay


class CommissionTests(unittest.TestCase):
    def setUp(self):
        self.ctx = app.app_context()
        self.ctx.push()
        db.drop_all()
        db.create_all()

        self.user = User(name='Test User', email='test@example.com', username='testuser', password='x')
        db.session.add(self.user)
        db.session.commit()

        # Period Jan 1 - Jan 15
        self.period = PayPeriod(start_date=date(2025, 1, 1), end_date=date(2025, 1, 15), timezone='UTC')
        db.session.add(self.period)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_unlock_exact_thresholds(self):
        # Tier requires sales 1000 and demos 5
        t = UserTierSchedule(user_id=self.user.id, sales_goal_in_period=1000, daily_demo_min=5,
                             hourly_rate=20.0, demo_bonus=10.0, effective_from=date(2025, 1, 1), active=True)
        db.session.add(t)
        # Day 1 sales 400, hours 8; Day 2 sales 600, hours 8
        db.session.add(SalesHours(user_id=self.user.id, date=date(2025,1,1), sales=400, hours=8))
        db.session.add(SalesHours(user_id=self.user.id, date=date(2025,1,2), sales=600, hours=8))
        # Demos: Day 2 demos=5 exactly
        db.session.add(Demos(user_id=self.user.id, date=date(2025,1,2), demos=5))
        db.session.commit()

        calc = compute_daily_pay(self.user.id, date(2025,1,2), self.period)
        self.assertEqual(calc['unlocked_tier_id'], t.id)
        self.assertEqual(calc['hourly_rate'], 20.0)
        self.assertEqual(calc['demo_bonus'], 10.0)
        self.assertEqual(calc['computed_pay'], 20.0*8 + 10.0*5)

    def test_demos_met_sales_not_met(self):
        t = UserTierSchedule(user_id=self.user.id, sales_goal_in_period=1000, daily_demo_min=5,
                             hourly_rate=20.0, demo_bonus=10.0, effective_from=date(2025, 1, 1), active=True)
        db.session.add(t)
        db.session.add(SalesHours(user_id=self.user.id, date=date(2025,1,1), sales=500, hours=8))
        db.session.add(Demos(user_id=self.user.id, date=date(2025,1,1), demos=6))
        db.session.commit()

        calc = compute_daily_pay(self.user.id, date(2025,1,1), self.period)
        self.assertIsNone(calc['unlocked_tier_id'])
        self.assertEqual(calc['computed_pay'], 0.0)  # no base tier

    def test_sales_met_demos_not_met(self):
        t = UserTierSchedule(user_id=self.user.id, sales_goal_in_period=1000, daily_demo_min=5,
                             hourly_rate=20.0, demo_bonus=10.0, effective_from=date(2025, 1, 1), active=True)
        db.session.add(t)
        db.session.add(SalesHours(user_id=self.user.id, date=date(2025,1,1), sales=1000, hours=8))
        db.session.add(Demos(user_id=self.user.id, date=date(2025,1,1), demos=4))
        db.session.commit()

        calc = compute_daily_pay(self.user.id, date(2025,1,1), self.period)
        self.assertIsNone(calc['unlocked_tier_id'])
        self.assertEqual(calc['computed_pay'], 0.0)

    def test_base_hourly(self):
        base = UserTierSchedule(user_id=self.user.id, sales_goal_in_period=0, daily_demo_min=0,
                                hourly_rate=15.0, demo_bonus=0.0, effective_from=date(2025, 1, 1), active=True)
        db.session.add(base)
        db.session.add(SalesHours(user_id=self.user.id, date=date(2025,1,1), sales=0, hours=6))
        db.session.add(Demos(user_id=self.user.id, date=date(2025,1,1), demos=0))
        db.session.commit()

        calc = compute_daily_pay(self.user.id, date(2025,1,1), self.period)
        self.assertIsNone(calc['unlocked_tier_id'])
        self.assertEqual(calc['computed_pay'], 15.0*6)


if __name__ == '__main__':
    unittest.main()


