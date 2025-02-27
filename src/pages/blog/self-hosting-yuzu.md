---
layout: "../../layouts/BlogPost.astro"
title: "Self Hosting Yuzu Server: Deploying with Docker"
pubDate: 2024-09-16
description: "A step by step tutorial for deploying a Yuzu multiplayer server using Docker and how to play Mario Kart 8 Deluxe"
author: 'Kaio Lima'
tags: ["docker", "tutorial", "linux", "self-hosted", "open-source"]
---
While playing games, one of my friends asked if we could play Mario Kart 8 Deluxe against each other on Yuzu. We tried using public rooms, but since we're from Brazil, latency was high playing on mostly European servers. That's why I decided self host a server in Brazil.

## Multiplayer on Yuzu
Yuzu's multiplayer feature has the ability to emulate _local wireless_ multiplayer over the Internet. Yuzu boasts a complex server/client infrastructure that forwards a game's wireless communication across the Internet.
Unlike single console netplay used in most emulators, users won't have to worry about desyncs, synchronizing saves, or any other issues typical of netplay. Each user is using their instance of yuzu as a unique emulated Switch that communicates with everyone else through a _multiplayer room,_ a server that can be hosted by anyone for connected clients to exchange data with each other.

## Hosting Rooms
The easiest way to host a room is using _Port forwarding._ You can use the UI (`Multiplayer > Host Room`) to create a room that will be deleted once you exit Yuzu.
### Hosting on Linux
First of all, you need a Linux VPS provider. I was using [Linode](https://linode.com/) since it has cheap options for Brazil-based VPS.
Once you have your VPS, you have to install _Docker_ on your host. Read [docker's documentation](https://docs.docker.com/#run-docker-anywhere) on how to install.
You now have your VPS with Docker installed, you can install the [`K4rian/docker-yuzu-room`](https://github.com/K4rian/docker-yuzu-room) to install the server software and fill in some arguments.
```
sudo docker run -d \
    -p 24872:24872/udp \
    k4rian/docker-yuzu-room \
    --max_members 4
```
That's it! Your server is now running. You can check using `docker ps`.

## Setting Up Yuzu for Multiplayer
### Keys and Firmware
To correctly play online you need Firmware 17 or 17.0.1 and Keys with the same version. I won't be providing them here.
### Connecting to Rooms
You can connect to your room using Yuzu's UI (`Multiplayer > Direct Connect to Room` or `CTRL+C`). Input your VPS IP address on the _Server Address_ field, the default `24872` port on the _Port_ field and your _Nickname_ to show to other players in the room.

## Playing MK8D
You have the game, firmware, Keys and you and your friends are connected to your room, now how to play?
On Mario Kart 8 Deluxe I couldn't play with my friends on Wireless Play. For some unknown reason that always gives an annoying _Communication Error._ The way we fixed it was playing on LAN Play instead.
### How to Lan on MK8D
**In the main menu** of the game, press **L + R + LEFT stick IN** simultaneously. If done correctly, the `Wireless Play` button will change to `LAN Play`.

## References
- [https://yuzu-testing.netlify.app/help/feature/multiplayer/](https://yuzu-testing.netlify.app/help/feature/multiplayer/)
- [https://yuzu-testing.netlify.app/entry/ldn-is-here/](https://yuzu-testing.netlify.app/entry/ldn-is-here/)
- [https://github.com/K4rian/docker-yuzu-room](https://github.com/K4rian/docker-yuzu-room)