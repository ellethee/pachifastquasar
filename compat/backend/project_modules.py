from pachifast.admin import AdminModule
from pachifast.presets import core_module

from apps.compat.module import module as compat_module

MODULES = (
    core_module,
    AdminModule,
    compat_module,
)
