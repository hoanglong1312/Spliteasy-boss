---
description: Code review diff hiện tại của Spliteasy-boss — dùng skill thật, không dispatch sub-agent riêng.
---

# /review — Code Review

## Steps

1. `git diff HEAD~1..HEAD` (đã commit) hoặc `git diff --cached` (staged chưa commit).
2. Invoke skill `code-review` với diff trên — correctness bug + reuse/simplification/efficiency.
3. Diff đụng `**/auth/**` · `**/middleware/**` · `**/api/**` · `**/*migration*` · `**/*rls*` · file có `req.body`/`req.params`/`formData` mới → thêm invoke skill `security-review`.
4. Nếu có finding → list, hỏi user muốn fix gì trước khi merge.
