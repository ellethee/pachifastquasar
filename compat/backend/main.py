from pachifast import create_app

from project_modules import MODULES

app = create_app(MODULES, cors_origins=["http://localhost"])
