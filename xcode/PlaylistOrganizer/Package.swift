// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PlaylistOrganizer",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "PlaylistOrganizer", targets: ["PlaylistOrganizer"])
    ],
    dependencies: [
        .package(url: "https://github.com/stephencelis/SQLite.swift.git", from: "0.15.0")
    ],
    targets: [
        .executableTarget(
            name: "PlaylistOrganizer",
            dependencies: [
                .product(name: "SQLite", package: "SQLite.swift")
            ]
        )
    ]
)
