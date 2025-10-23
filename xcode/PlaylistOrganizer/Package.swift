// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PlaylistOrganizer",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(name: "PlaylistOrganizer", targets: ["PlaylistOrganizer"]),
        .executable(name: "TerminalImportTest", targets: ["TerminalImportTest"])
    ],
    dependencies: [
        .package(url: "https://github.com/stephencelis/SQLite.swift.git", from: "0.15.0")
    ],
    targets: [
        .target(
            name: "PlaylistOrganizer",
            dependencies: [
                .product(name: "SQLite", package: "SQLite.swift")
            ],
            path: "Sources/PlaylistOrganizer"
        ),
        .testTarget(
            name: "PlaylistOrganizerTests",
            dependencies: ["PlaylistOrganizer"],
            path: "Tests/PlaylistOrganizerTests"
        ),
        .executableTarget(
            name: "TerminalImportTest",
            dependencies: [
                .product(name: "SQLite", package: "SQLite.swift")
            ],
            path: "Sources/TerminalImportTest"
        )
    ]
)




