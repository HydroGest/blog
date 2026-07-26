---
date: "2026-07-26T20:00:08+08:00"
title: "Windows 装包神器 Chocolatey 安装指南"
tags: ["Windows", "工具"]
---

Chocolatey 是 Windows 上的包管理器，类似 Linux 的 `apt` 或 `brew`。有了它你就不用再跑去浏览器搜软件、找下载按钮、下一步下一步了，一行命令装完。

# 安装

## 准备工作

首先以管理员身份打开 PowerShell。

> 以防你不知道怎么以管理员身份运行：右键左下角开始菜单 → 终端。如果弹出 UAC 窗口，点"是"。

然后执行粘贴这一条命令：

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

等它跑完，关掉这个 PowerShell 再重新打开一个。执行 `choco -?`，如果能看到一堆帮助信息就说明装好了。

## 验证

```powershell
choco --version
```

## 换源（可选）

国内网络环境下，默认源可能很慢。换到中科大的镜像：

```powershell
choco source add -n=ustc -s=https://mirrors.ustc.edu.cn/chocolatey/ --priority=1
choco source remove -n=chocolatey
```

# 日常用法

搜软件：

```powershell
choco search firefox
```

安装：

```powershell
choco install firefox -y
```

`-y` 的意思是自动确认，不加的话每一步都要你手动确认。

升级所有已装软件：

```powershell
choco upgrade all -y
```

卸载：

```powershell
choco uninstall firefox -y
```

# 一些用得上 choco 装的东西

```powershell
choco install vscode -y             # VS Code
choco install 7zip -y               # 解压
choco install everything -y         # 文件搜索
choco install powertoys -y          # 微软小工具集
choco install openssh -y            # SSH 客户端
choco install nodejs-lts -y         # Node.js
choco install git -y                # Git
```

> 大部分软件装完后需要重新打开终端才能用新加的环境变量。如果刚装完 `choco` 提示找不到命令，关掉终端重开就好。~~别问我怎么知道的~~