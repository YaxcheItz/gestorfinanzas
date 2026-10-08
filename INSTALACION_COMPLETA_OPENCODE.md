=== REVISIÓN + INSTALACIÓN COMPLETA (OpenCode) ===

Fecha: 10/04/2026 00:06:04

## 1. CLI instalado
- ui-ux-pro-max-cli@latest (global)
- uipro init --ai opencode --global --force → regenerado para .opencode/skills/

## 2. Plugin memoria
- claude-mem instalado para OpenCode (plugin + hooks). Worker: 
px claude-mem start

## 3. MCP añadido
- n8n-mcp → añadido como MCP (stdio) en: %USERPROFILE%\.config\opencode\opencode.json

## 4. Skills instalados (GLOBAL: .opencode/skills)
Total directorios: 

Destacados:
- emilkowalski/skills: todos copiados (animate, animate-expo, apple-design, mobile-native, prototype, review-animations, find-animation-opportunities, improve-animations, emil-design-eng, pick-ui-library, ask-sonner, banner-design, brand, design-system, slides...)
- taste-skill: taste-skill, taste-skill-v1, gpt-tasteskill, image-to-code-skill, redesign-skill, soft-skill, output-skill, minimalist-skill, brutalist-skill, stitch-skill
- imagegen: imagegen-frontend-web, imagegen-frontend-mobile, brandkit
- cyber-neo: COMPLETO (SKILL.md + references/ (14) + scripts/ (2))
- everything-claude-code (skills): extraídos todos los skills compatibles
- ui-ux-pro-max: regenerado vía CLI

## 5. Commands (GLOBAL: .opencode/commands)
Total: 
(15 comandos útiles: plan, code-review, build-fix, refactor-clean, verify/checkpoint/learn/eval, orchestrate, tdd, e2e, setup-pm...)

## 6. Lo NO instalado (explícito)
- OmniRoute: App completa (self-host). No va en OpenCode. Correcto excluir.
- n8n-mcp: NO como skill → configurado como MCP (correcto).
- everything-claude-code (agentes/hooks): Solo skills+commands extraídos. Muchos .claude/* no son 1:1 OpenCode. Mejor selectivo.

## 7. Para usar después
- Reinicia OpenCode para que cargue plugin (claude-mem) + skills + commands + MCP.
- Iniciar memoria: 
px claude-mem start (abrir http://127.0.0.1:37777 para ver stream)
- n8n-mcp aparece como servidor MCP (stdio) listo para usar.

== FIN ==
