---
date: "2026-07-27T18:30:00+08:00"
title: "BlockyLauncher —— 新一代模块化 Minecraft 启动器"
tags: ["Minecraft", "启动器", "C#", ".NET", "项目"]
---

![](/images/屏幕截图-2026-07-27-183955.png)

Minecraft 启动器这块向来不缺选择：官启、HMCL、PCL、BakaXL，甚至美西螈启动器……那为什么还要自己写一个？

原因很简单——**我想要一个真正模块化的启动器**。不是那种"支持插件"但核心代码拧成一团的，而是从底层架构就允许每个功能被独立替换、独立扩展的。~~另外我也想用 .NET 10 + Avalonia UI 写点真正能用的东西，而不是整天写 CRUD（笑）。~~

于是就写了 BlockyLauncher。

# 整体架构

BlockyLauncher 分成五层：

```
BlockyLauncher.Abstractions     # 纯接口层
BlockyLauncher.PluginSDK        # 插件开发 SDK
BlockyLauncher.Framework        # 框架核心实现
BlockyLauncher.Desktop          # Avalonia 桌面入口
BlockyLauncher.Plugins.BuiltIn  # 6 个内置插件
```

有趣的地方在于，「内置」插件其实走的是和第三方插件完全一样的加载通道。它们在 `.csproj` 里用 `Private="false" ReferenceOutputAssembly="false"` 引用，编译时不链接，运行时从 `builtin/` 目录动态加载。也就是说，启动器的核心功能和第三方开发者将来写的一个插件，在框架眼里是没有区别的。~~其实这里是在致敬 [Koishi](https://koishi.chat)。~~

这意味着什么？

这个这意味着启动器的核心跟 Minecraft 是完全解耦的！甚至创建 Minecraft 游戏实例、启动 Minecraft 游戏、管理 JVM 等等启动器的核心功能，都只是插件，只不过是预装的而已。你未来大可以写一个 Minecraft Server 启动器插件、Touhou 启动器插件，甚至 PS 主机游戏启动插件，并且可以将你自己的插件分发，其他人只需在“设置”里动动鼠标即可一键安装。

# 插件怎么工作

每个插件实现 `IPlugin` 接口的三个方法：

```csharp
public interface IPlugin
{
    string Id { get; }
    Task InitializeAsync(IPluginContext context);
    Task OnServicesReadyAsync(IServiceProvider services);
    Task ShutdownAsync();
}
```

- **InitializeAsync** 里注册视图、服务、设置页面，这时候你只能用自己的东西
- **OnServicesReadyAsync** 时所有服务都就位了，可以获取其他插件注册的服务来协作。
- **ShutdownAsync** ~~收尸~~。

插件通过 `IPluginContext` 接触到框架提供的一切能力，包括但不限于注册导航页面、注册设置页面、发布/订阅事件、注册自己的服务给别人用。配合 `manifest.json` 描述元信息：

```json
{
    "id": "builtin-java",
    "name": "Java 管理器",
    "entryPoint": "BlockyLauncher.Plugins.Java.MainPlugin",
    "minApiVersion": 1
}
```

# 内置插件 ≈ 核心功能

6 个内置插件拆分了传统启动器揉在一起的功能：

| 插件 | 干什么吃的 |
|---|---|
| **AuthPlugin** | 登录验证，注册 Microsoft / Offline 认证 |
| **JavaPlugin** | 扫描系统 Java，注册 `IJavaRuntimeService` |
| **VersionPlugin** | 拉取 Mojang 版本清单、版本详情 |
| **ComponentPlugin** | 实例创建 + 文件下载组装 + natives 提取 |
| **LaunchPlugin** | 监听 `LaunchRequestedEvent`，协调下载→启动 |
| **DownloadManagerPlugin** | 多文件并发下载引擎 |

插件之间通过事件解耦 ~~（我是事件总线梦男）~~。比如负责启动 Minecraft 的 LaunchPlugin 想要展示启动进度，不直接调用下载逻辑，而是订阅 `LaunchRequestedEvent`；下载进度通过 `IDownloadService` 的事件回传；UI 层只需监听就绪/失败事件来更新界面。全部用 `IEventAggregator` 这个简单的发布/订阅总线串起来：

```csharp
_eventAggregator.Publish(new LaunchRequestedEvent(instance, account));
// 别处订阅:
context.EventAggregator.Subscribe<LaunchRequestedEvent>(OnLaunchRequested);
```

# 一些有意思的设计

导航菜单不是写死在 XAML 里的。`IViewRegistry` 收集所有插件注册的页面，`MainView` 在加载时动态构建 NavigationView 的菜单项。加一个新的插件页面，重启就出现了。

设置界面同理。`ISettingsRegistry` 让插件注册自己的设置区块。Java 设置、下载设置……每个插件各自管自己的配置 UI，框架只提供一个列表把它们整合。

启动流程全链路事件驱动，从点击"启动"按钮到 Minecraft 窗口弹出来，来自多个插件的协同，但他们完全是解耦的，并且整个流程没有点同步阻塞 ~~，丝滑如窜西~~：

```csharp
// 主页，用户点击启动 -> 发布事件
_eventAggregator.Publish(new LaunchRequestedEvent(instance, account));

// LaunchPlugin 订阅 -> 校验实例类型 -> 弹出进度对话框 -> 开始下载
context.EventAggregator.Subscribe<LaunchRequestedEvent>(OnLaunchRequested);

// 下载完成后自动启动 JVM -> 发布 LaunchStartedEvent
_eventAggregator.Publish(new LaunchStartedEvent(instance, processId));

// UI 层收到后关闭进度对话框、恢复按钮、弹 Toast
_launchStartedSub = _eventAggregator?.Subscribe<LaunchStartedEvent>(OnLaunchStarted);
```
有意思的地方在于，进度对话框的生命周期也是通过事件管理的。LaunchPlugin 在 `OnLaunchRequested` 里订阅 `LaunchStartedEvent` 和 `LaunchFailedEvent`，任何一个触发就关闭对话框并清理订阅。如果用户手动取消，取消对话框的
同时取消 `CancellationTokenSource`，下载和启动双双终止。事件的订阅全部返回 `IDisposable`，用完就丢，不留 dangling handler。


# 技术栈

- .NET 10 + C#
- Avalonia 12 + FluentAvaloniaUI 3
- CommunityToolkit.Mvvm
- Microsoft.Extensions.DependencyInjection
- GPLv3 开源

# 为什么用 BlockyLauncher

上面说了这么多代码的事，那对不动代码的用户来说，BlockyLauncher 有什么不一样？

- 界面不是固定的。导航栏的每一个页面都是插件注册进来的。你今天装了一个皮肤站插件，导航栏就多一个"皮肤"页；装了一个 Mod 管理插件，就多一个"模组"页。插件卸载了，页面自动消失。不需要改任何配置文件，不需要翻设置开
关。

- 设置页也是各插件的。Java 路径设置在 Java 插件里，下载并发数在下载插件里，主题切换在主框架里——每个插件各自管自己的配置 UI，在设置页里按顺序排好。不会有"这个设置到底在哪"的困惑，因为每个设置区块的归属是清晰
的。

- 下载走国内镜像。Mojang 的源在国内什么速度不用我多说。BlockyLauncher 默认就配好了 BMCLAPI 镜像，关掉启动器开箱即用，不需要自己去查教程改 hosts 或者配代理。

- 可以 DIY 的程度很高。想有一个完全自己风格的启动器？你可以改主题、换配色、增减导航项。更进一步的话，你甚至可以：

    - 写一个插件在主页加一个"每日一句"的卡片
    - 写一个插件在启动游戏时自动备份存档
    - 写一个插件统计你的游戏时长，生成年度报告
    - 写一个插件对接自己的皮肤站

    而且安全。插件的权限由框架管控——插件能接触到什么数据、能调用什么 API，取决于它拿到的 IPluginContext。框架不加载不签名的外部 DLL，插件的 manifest 里声明了 dependencies 和 minApiVersion，版本不兼容的插件根本不
    会加载。

**省流：喜欢折腾的有福了。**

# 现在做到哪了

基本的流程已经通了：创建实例 -> 选择版本 -> 下载游戏文件 -> 启动 Minecraft。认证支持 Microsoft 登录和离线模式。Java 可以自动扫描系统安装和按路径添加。

不过毕竟还在早期，离一个真正好用的启动器还有距离。比如还没做 Mod 管理、资源包管理、游戏日志查看器这些。

代码在 GitHub 目前还是 Private，敬请期待吧。

![](/images/屏幕截图-2026-07-27-184010.png)

UI 不代表最终品质。