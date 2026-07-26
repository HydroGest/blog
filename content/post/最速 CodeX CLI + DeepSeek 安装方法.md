---
date: '2026-07-26T18:57:08+08:00'
draft: false
title: '最速 CodeX CLI + DeepSeek 安装方法'
---

CodeX 是程序员的有力杀手，有了它哪怕你是~美少女~不懂编程的萌新，也能高效完成复杂项目的开发。CodeX CLI 是 CodeX 的命令行版本，更加适合新手，操作简单。本文将分享使用 DeepSeek API 的 CodeX 安装指南。学会了这个以后可以自己换成其他模型的 API。

# 安装教程

##  API 准备

首先打开 [DeepSeek 开放平台](https://platform.deepseek.com/)，如果你还没有充值过，请先给 DeepSeek 充值。当充值完成，打开 “API keys” 页面，创建一个 API key，它长这样：`sk-....`。

> 以防你不知道 API 是什么意思：简单理解，就是服务提供者给你提供的一个接口，你可以用这个接口去享受服务（在这里就是大模型服务）。

## 安装 CC Switch

CodeX 默认只支持 OpenAI 自己家的模型（没错就是 ChatGPT），但是，通过 [CC Switc](https://www.ccswitch.io/zh/) 这个工具，可以强制让他支持几乎所有的模型。

> 关于 CC Switch：CC 的意思是 Claude Code。没错，它一开始是为 CodeX 的竞品 Cluade Code（简称CC）设计的，用于强制 CC 使用自定义的模型。它的原理简单说就是将原本发往 OpenAI / Anthropic 自家模型的网络请求偷偷路由到你设定的模型提供商（正如这里的 DeepSeek）上，来帮助你省钱。

CC Switch 下载：[Release 页面](https://github.com/farion1231/cc-switch/releases)

对于网络不太好的 Windows 同学：[CC-Switch-v3.18.0-Windows.msi，由 gh-proxy.com 代理](https://gh-proxy.com/https://github.com/farion1231/cc-switch/releases/download/v3.18.0/CC-Switch-v3.18.0-Windows.msi)

安装完毕后，先点击全屏。先点击顶部的 CodeX 图标，然后再点击右边的加号。

![](/images/屏幕截图-2026-07-26-191828.png)

接下来，在新出现的页面往下滚动找到 DeepSeek，点击。

![](/images/屏幕截图-2026-07-26-192439.png)

往下滚动，在 “API Key” 的文本框内填入刚刚在 DeepSeek 开放平台创建的 API Key。

然后点击右下角的“添加”按钮，回到首页。将鼠标移到 DeepSeek 的列表项，点击绿色的“启用”按钮，接下来在顶部将路由开关打开。

![](/images/屏幕截图-2026-07-26-192841.png)

## 安装 CodeX CLI

### 下载

我个人比较喜欢安装 zip 版。

打开 CodeX Release 页面：[Latest Release](https://github.com/openai/codex/releases/latest)，Ctrl + F 搜索 `codex-app-server-x86_64-pc-windows-msvc.exe.zip
`，下载。

依旧，对于网不好的同学：[codex-app-server-x86_64-pc-windows-msvc.exe.zip，由 gh-proxy.com 代理](https://gh-proxy.com/https://github.com/openai/codex/releases/download/rust-v0.145.0/codex-app-server-x86_64-pc-windows-msvc.exe.zip)

下载后解压到你喜欢的位置。然后将其中的 `codex-x86_64-pc-windows-msvc.exe` 重命名为 `codex.exe`，方便日后使用。

接下来右键地址栏复制当前路径。

![](/images/屏幕截图-2026-07-26-193826.png)

回到桌面，右键“此电脑”->“属性”-“高级系统设置”->“环境变量”，点击 “Path”，编辑。

![](/images/屏幕截图-2026-07-26-194353.png)

在右侧点击“新建”，然后在新一项中粘贴刚刚复制的文件路径，点击“确定”

![](/images/屏幕截图-2026-07-26-194613.png)

一路“确定”，然后你可以安全地关闭这些窗口了。

## 使用

现在基本上大功告成！在任何你喜欢的地方右键菜单，点击“在终端中打开”，接下来输入 `codex` 回车，就可以让 CodeX 操作这里的任何文件。 

## 补充

当然，这里建议给 CC Switch 设置开机自启动。回到 CC Switch，点击左上角的齿轮图标打开设置，在“通用”里往下滑，找到“窗口行为”设置项，将“开机自启”和“静默启动”打开即可。