{{- define "inmidst.name" -}}
inmidst
{{- end }}

{{- define "inmidst.fullname" -}}
{{ include "inmidst.name" . }}
{{- end }}

{{- define "inmidst.apiName" -}}
{{ include "inmidst.name" . }}-api
{{- end }}

{{- define "inmidst.orchestratorName" -}}
{{ include "inmidst.name" . }}-orchestrator
{{- end }}

{{- define "inmidst.webName" -}}
{{ include "inmidst.name" . }}-web
{{- end }}
