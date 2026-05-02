# nhl-stats — agent notes

Quick reference for AI assistants. For full architecture, see the top-level `CLAUDE.md`.

## Deploy

```bash
./deploy.sh https://nhl-stats.jesco39.com
```

The script accepts a URL, hostname, or IP:
- **SSH key:** auto-loads `~/.ssh/google_compute_engine`
- **SSH user:** defaults to `jesco`
- **App dir:** `/opt/nhl-stats` on the VM
- **Port:** `8083` (set via `PORT` env var in systemd unit if overriding)

### Finding the VM

```bash
gcloud config set project jesco39-com
gcloud compute instances list
```

Same VM as `cask`, `whisky`, and `guest-stay` (named `dunnage`, zone `us-central1-a`, GCP project `jesco39-com`).

### What deploy.sh does

1. Cross-compiles the Go binary for `linux/amd64`.
2. `scp`s the binary, `templates/`, and `static/` to `/tmp` on the VM.
3. `sudo mv`s them into `/opt/nhl-stats` and fixes ownership.
4. `sudo systemctl restart nhl-stats`.

### First-time VM prep

Run once before the first `deploy.sh`:

```bash
ssh <vm-ip> 'bash -s' < deploy/setup-vm.sh
```

Also ensure `nhl-stats.jesco39.com` has an `A` record pointing at the VM's external IP.
