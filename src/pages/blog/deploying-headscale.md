---
layout: "../../layouts/BlogPost.astro"
title: "Deploying Headscale"
pubDate: 2025-02-27
description: "A step by step tutorial for building and deploying a Headscale (a tailscale control pane) instance"
author: "Kaio Lima"
tags: ["network", "tutorial", "linux", "self-hosted", "open-source"]
---
Where I work we got some machines running in our office that I always wanted to use as servers. The main problem was: there's no _Port Forwarding._ Without port forwarding I wasn't able to host anything that needed to expose itself to the internet, no APIs, no static content, no nothing. Since our network already had performance issues because of the number of clients, I didn't get permission to set up port forwarding, so I had to find another way.

# Tailscale
[Tailscale](https://tailscale.com/) is **a mesh VPN service** that creates a private network between your devices using WireGuard. It allows you to securely access devices, services, and servers across different locations as if they were on the same local network.
Using Tailscale means I could rent a cheap VPS on any VPS provider, use Tailscale to connect it to my other servers and use the cheap one to expose services to the internet.
There's another problem: Tailscale is not free for commercial use.

# Headscale
[Headscale](https://headscale.net/) is an open-source, self-hosted implementation of the Tailscale control server. With Headscale we can create a self-hosted private network without relying on Tailscale's cloud infrastructure. Self-hosting means I could use it commercially with the only pricing of managing the infrastructure myself.

# Setup Headscale
## Prerequisites
First, you need a server to act as the coordination server. The coordination server is a centralized server that manages control plane operations and maintains a connection to all tailnet devices. Since the coordination server needed an external ip and an open port, I rented a cheap VPS at Linode close to my location. Even a 1GB shared CPU will work.
You also need a domain to connect to your network with which you can buy or use any subdomain.
## Nginx
Since I will also use my coordination server as a DERP and proxy, I will use Nginx as a reverse proxy. Install it with:
```
sudo apt install nginx
sudo systemctl enable --now nginx
```
## Installing Headscale on Debian
Download the [latest headscale package](https://github.com/juanfont/headscale/releases/latest) for your platform (.deb for Ubuntu and Debian).
```sh
HEADSCALE_VERSION="" # See above URL for latest version, e.g. "X.Y.Z" (NOTE: do not add the "v" prefix!)
HEADSCALE_ARCH="" # Your system architecture, e.g. "amd64"
wget --output-document=headscale.deb \
 "https://github.com/juanfont/headscale/releases/download/v${HEADSCALE_VERSION}/headscale_${HEADSCALE_VERSION}_linux_${HEADSCALE_ARCH}.deb"
```
Then install headscale:
```sh
sudo apt install ./headscale.deb
```
## Setup Domain
The first thing you need to config is your domain. You must set a `A` record pointing to your coordination server ip address. Note: If you use Cloudflare set the domain to DNS Only as Headscale doesn't work behind proxies. See [juanfont/headscale#1468](https://github.com/juanfont/headscale/issues/1468).
## Headscale Config
Edit Headscale's config file at `/etc/headscale/config.yaml`, the main settings are:
- Server Config
```yaml
# The url clients will connect to.
# Set it to your domain + headscale port
server_url: https://example.domain:7000

# Address to listen to
# Set it to 0.0.0.0 + headscale port
listen_addr: 0.0.0.0:7000`
```
- Derp \
DERP is a relay system that Tailscale uses when a direct connection can't be established. See: https://tailscale.com/blog/how-tailscale-works/
```yaml
derp:
  server:
    enabled: true
    region_id: 999
    region_code: "headscale"
    region_name: "Headscale Main"
    # Set it to your server external ipv4 address
    ipv4: 123.123.123.123
    ipv6:
  # List of externally available DERPs
  # Comment out Tailscale's derpmap to use only your server as derp
  # You may upgrade your network by introducing more DERPs
  # but not needed for me
  urls:
    #- https://controlplane.tailscale.com/derpmap/default
```
Other derp options may be left as default.
- DNS \
Headscale supports Tailscale's DNS and [MagicDNS](https://tailscale.com/kb/1081/magicdns/).
```yaml
dns:
  # If you want to use MagicDNS
  # https://tailscale.com/kb/1081/magicdns/
  magic_dns: true
  # Defines the base domain to create the hostnames for MagicDNS
  # This domain _must_ be different from the server_url domain
  # This domain _must_ be a FQDN without the trailing dot
  # The FQDN of the hosts will be:
  # `hostname.base_domain` (e.g., myhost.example.br)
  base_domain: example.br
```
## TLS Configuration
### Already Have Certificates
If you already have a certificate for your domain, you may just use them. Open `/etc/headscale/config.yaml` and change these settings:
```yaml
# Path to your TLS certificate
tls_cert_path: ""
# Path to your TLS certificate key
tls_key_path: ""
```
Remember Headscale runs on user `headscale`. Setup so it can read the certificate files.
### Setup Let's Encrypt / ACME
Headscale supports automatically requesting and setting up TLS for a domain with Let's Encrypt.
It works by using [Let's Encrypt HTTP-01 challenge](https://letsencrypt.org/docs/challenge-types/#http-01-challenge). Headscale will setup the HTTP server on a specified port (as example I will use `8000`) but Let's Encrypt will only try connecting to port `80`.
For this to work with nginx, open `/etc/nginx/sites-enabled/default` and set it to:
```sh
server {
  listen 80 default_server;
  server_name _;

  location /.well-known/acme-challenge/ {
    proxy_http_version 1.1;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    # Remember to set to your own defined port
    proxy_pass http://127.0.0.1:8000;
  }
}
```
Open `/etc/headscale/config.yaml` and change these settings:
```yaml
# Email to register with ACME provider
acme_email: ""
tls_letsencrypt_challenge_type: HTTP-01
# Set to the port you defined before on nginx
# Keep the `:`
tls_letsencrypt_listen: ":8000"
```
## Run Headscale
After everything is setup correctly you can run headscale with:
```sh
sudo systemctl enable --now headscale
sudo systemctl status headscale
```
If everything was setup correctly, it must show `active (running)`. You can check errors using journalctl:
```sh
journalctl -b -u headscale
```
then pressing `Shift + G` to go to the bottom of the logs.
## Create a Headscale User
Nodes (a device in a network) is always assigned to a headscale user. Users may have multiple nodes assigned to them. You can create a user using:
```sh
headscale users create <USER>
```
## Install Clients
After everything is done, you now need to install Tailscale on your devices. See https://tailscale.com/download on how to setup. Since my coordination server will act as a proxy and need to connect to other devices, I will also be using it as a client.
```sh
curl -fsSL https://tailscale.com/install.sh | sh
```
This will install Tailscale on Linux.
### Connect to the Network
Run the `tailscale up` command with your coordination server url and port as login server:
```sh
tailscale up --login-server https://example.com:7000
```
Now a browser window with further instructions is opened and contains the command to run on the coordination server. It will be something like:
```sh
headscale nodes register --user <USER> --key <MACHINE_KEY>
```
Remember to set `<USER>` to the user you created before.
Alternatively, follow the instructions to connect [Android](https://headscale.net/stable/usage/connect/android/), [Apple](https://headscale.net/stable/usage/connect/apple/) or [Windows](https://headscale.net/stable/usage/connect/windows/) device.
After registering a node, test it with:
```sh
tailscale netcheck
```
It must return a list of DERPs including only your defined derps.
# Using Nginx as a Reverse Proxy
After successfully installing and setting up my Headscale network, now I can finally use Nginx as a reverse proxy to expose a device on a local network to the internet.
To test it, first I will be logging in to the local machine and setting up a simple server.
```sh
cd /tmp
echo "Hello World" > index.html
python3 -m http.server 8888
```
Now I can go back to the coordination server and setup the proxy. To connect to other devices we can use their network ip address or MagicDNS. First, use `tailscale status` to check all connected devices. It must return something like:
```
100.64.0.3      coord-server         myuser      linux   -
100.64.0.2      another-debi         myuser      linux   -
```
In my case, `coord-server` is the coordination server which is exposed to the internet while `another-debi` is the server I just setup the http server and isn't exposed to the internet.
On the `coord-server` I can connect to `another-debi` using either `100.64.0.2` or `another-debi.example.br` (`example.br` is the domain set on [dns](#headscale-config)). So I can set up Nginx as follows:
```sh
server {
  listen 80;
  
  # Set it to the domain name
  server_name _;

  location / {
    proxy_http_version 1.1;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_pass http://100.64.0.2:8888;
  }
}
```
Connecting to the domain name should now return `Hello World`.
# Using Nginx as TCP or UDP Reverse Proxy
Alternatively, you can also use Nginx as a TCP or UDP proxy on services that doesn't rely on http.
First install nginx stream module:
```sh
apt install libnginx-mod-stream
```
Open `/etc/nginx/nginx.conf` go to the bottom of the file and create a `stream` block:
```sh
stream {
  server {
    # External port to listen to
    listen 8000;
    # Internal address to redirect to
    proxy_pass 100.64.0.2:8888;
  }

  server {
    # Use udp
    listen 19132 udp;
    proxy_pass 100.64.0.2:19132;
  }
}
```
# Web UI
Optionally you can setup a web interface for headscale. See https://headscale.net/stable/ref/integration/web-ui/

# Closing Thoughts
While I still need to pay for the coordination server, I now can host any app on the server on the internal network and expose them to the internet using Headscale. Even on a 1 core CPU Headscale runs fine as a proxy. Kudos to the Tailscale and Headscale teams for creating such amazing software.