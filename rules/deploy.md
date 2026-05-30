# Deploy Rules — SpliteasyBoss

## "deploy" = merge main + push

Khi user nói "deploy", "lên production", "ship", "push lên" (không specify branch):
1. `git checkout main`
2. `git merge <current-branch> --no-edit`
3. `git push origin main`
4. Báo: branch nào đã merge, Vercel auto-deploy từ main.

Vercel project connect với GitHub repo, auto-deploy khi main thay đổi. Không cần lệnh Vercel riêng.

## Fallback nếu Vercel không auto-deploy

Nếu sau 2 phút push mà Vercel vẫn serve bundle cũ (kiểm tra bằng `curl -s <url> | grep assets/index`):

```bash
vercel --prod
```

Bypass GitHub webhook, deploy trực tiếp qua CLI. Root cause thường là Vercel-GitHub webhook broken → fix dứt điểm bằng cách disconnect/reconnect GitHub integration trong Vercel dashboard.

## Không hỏi lại khi

- User đang ở feature branch và nói "deploy" → assume merge to main
- Branch đã push lên remote → merge ngay, không cần confirm thêm

## Vẫn hỏi khi

- Có conflict khi merge
- Branch chưa build pass (`npm run build` chưa chạy trong session này)
