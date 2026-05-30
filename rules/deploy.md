# Deploy Rules — SpliteasyBoss

## "deploy" = merge main + push

Khi user nói "deploy", "lên production", "ship", "push lên" (không specify branch):
1. `git checkout main`
2. `git merge <current-branch> --no-edit`
3. `git push origin main`
4. Báo: branch nào đã merge, Vercel auto-deploy từ main.

Vercel project connect với GitHub repo, auto-deploy khi main thay đổi. Không cần lệnh Vercel riêng.

## Không hỏi lại khi

- User đang ở feature branch và nói "deploy" → assume merge to main
- Branch đã push lên remote → merge ngay, không cần confirm thêm

## Vẫn hỏi khi

- Có conflict khi merge
- Branch chưa build pass (`npm run build` chưa chạy trong session này)
