from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, HttpResponseNotFound


def serve_frontend(request, *args, **kwargs):
    index_path = settings.FRONTEND_DIST / 'index.html'
    if not index_path.exists():
        return HttpResponseNotFound('Frontend build not found — run "npm run build" in frontend/.')
    return HttpResponse(index_path.read_text(encoding='utf-8'))


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/onboarding/', include('apps.onboarding.urls')),
    path('api/v1/documents/', include('apps.documents.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    # SPA catch-all: anything not matched above falls through to the React app,
    # so client-side routes (e.g. /dashboard) work on a hard refresh.
    re_path(r'^(?!api/|admin/|static/|media/).*$', serve_frontend),
]
