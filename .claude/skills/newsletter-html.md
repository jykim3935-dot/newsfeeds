---
name: newsletter-html
description: 뉴스레터 이메일 HTML 생성/수정 시 사용. 이메일 호환성 규칙 적용.
---
# 뉴스레터 HTML 규칙
- MUST: table만, inline style만, 단색 배경만, 600px, <102KB, 14px+
- 구조: Header → BLUF → Stats → 🔴카드(Deep+Action) → 🟡카드 → 트렌드 → 전체목록 → Footer
- 카드: red=border-left #EF4444 bg #FEF2F2, yellow=#F59E0B, Action=bg #FEF3C7
- BAD: display:flex, linear-gradient, <style>, class 속성
- 참조 구현: @docs/Plan.md 부록 D
