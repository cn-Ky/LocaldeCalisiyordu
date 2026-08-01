cmake_minimum_required(VERSION 3.16)
project(LocaldeCalisiyordu VERSION 0.2.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Widgets Sql)

# ---------------------------------------------------------------------------
# libsodium: Linux/macOS'ta pkg-config ile, Windows'ta vcpkg'nin ürettiği
# "unofficial-sodium" CMake config paketiyle bulunur (vcpkg'nin resmi
# libsodium portu bu ismi kullanır; pkg-config Windows/MSVC'de güvenilir
# çalışmadığı için burada ayrılıyor).
# ---------------------------------------------------------------------------
if(WIN32)
    find_package(unofficial-sodium CONFIG REQUIRED)
    set(SODIUM_TARGET unofficial-sodium::sodium)
else()
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(SODIUM REQUIRED libsodium)
endif()

set(APP_SOURCES
    src/main.cpp
    src/core/Database.cpp
    src/core/PasswordHasher.cpp
    src/core/AuthService.cpp
    src/core/ProjectService.cpp
    src/core/FileService.cpp
    src/core/Session.cpp
    src/ui/LoginWindow.cpp
    src/ui/MainWindow.cpp
    src/ui/NewProjectDialog.cpp
    src/ui/NewFileDialog.cpp
    src/ui/CodeHighlighter.cpp
    src/ui/ProjectEditorWindow.cpp
    src/resources.qrc
)

if(WIN32)
    # Windows uygulama ikonu + sürüm bilgisi (.rc kaynağı).
    set(APP_SOURCES ${APP_SOURCES} packaging/windows/app.rc)
endif()

add_executable(localde-desktop ${APP_SOURCES})

target_include_directories(localde-desktop PRIVATE src)
target_link_libraries(localde-desktop PRIVATE Qt6::Core Qt6::Widgets Qt6::Sql)
target_compile_definitions(localde-desktop PRIVATE
    SOURCE_STYLE_PATH="${CMAKE_SOURCE_DIR}/src/ui/style.qss"
    APP_VERSION="${PROJECT_VERSION}"
)

if(WIN32)
    target_link_libraries(localde-desktop PRIVATE ${SODIUM_TARGET})
    # Konsol penceresi açılmasın.
    set_target_properties(localde-desktop PROPERTIES WIN32_EXECUTABLE TRUE)
else()
    target_include_directories(localde-desktop PRIVATE ${SODIUM_INCLUDE_DIRS})
    target_link_libraries(localde-desktop PRIVATE ${SODIUM_LIBRARIES})
    target_compile_options(localde-desktop PRIVATE ${SODIUM_CFLAGS_OTHER})
endif()

if(APPLE)
    # macdeployqt yalnızca gerçek bir .app bundle üzerinde çalışır;
    # bu olmadan CMake düz bir Unix çalıştırılabilir dosyası üretir.
    set_target_properties(localde-desktop PROPERTIES MACOSX_BUNDLE TRUE)
endif()

# Çekirdek servisleri arayüz olmadan doğrulayan yardımcı test hedefi.
add_executable(core_tests EXCLUDE_FROM_ALL
    src/tests/manual_test.cpp
    src/core/Database.cpp
    src/core/PasswordHasher.cpp
    src/core/AuthService.cpp
    src/core/ProjectService.cpp
    src/core/FileService.cpp
)
target_include_directories(core_tests PRIVATE src)
target_link_libraries(core_tests PRIVATE Qt6::Core Qt6::Sql)
if(WIN32)
    target_link_libraries(core_tests PRIVATE ${SODIUM_TARGET})
else()
    target_include_directories(core_tests PRIVATE ${SODIUM_INCLUDE_DIRS})
    target_link_libraries(core_tests PRIVATE ${SODIUM_LIBRARIES})
    target_compile_options(core_tests PRIVATE ${SODIUM_CFLAGS_OTHER})
endif()

# ---------------------------------------------------------------------------
# Kurulum kuralları (Linux'ta `make install` / CPack tarafından kullanılır).
# Windows/macOS paketlemesi CI iş akışında windeployqt/macdeployqt ile ayrıca
# yapılır (bkz. .github/workflows/release.yml), bu yüzden install() kuralları
# yalnızca Linux'a özgü tutuldu.
# ---------------------------------------------------------------------------
if(UNIX AND NOT APPLE)
    include(GNUInstallDirs)

    install(TARGETS localde-desktop RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})

    install(FILES packaging/linux/localde-calisiyordu.desktop
            DESTINATION ${CMAKE_INSTALL_DATADIR}/applications)

    foreach(size IN ITEMS 16 32 48 64 128 256 512)
        install(FILES packaging/linux/icons/icon-${size}.png
                DESTINATION ${CMAKE_INSTALL_DATADIR}/icons/hicolor/${size}x${size}/apps
                RENAME localde-calisiyordu.png)
    endforeach()
endif()

# ---------------------------------------------------------------------------
# CPack — platforma göre .deb (Linux) / NSIS kurulum sihirbazı (Windows) üretir.
# macOS paketlemesi (.dmg) CPack yerine macdeployqt ile CI'da yapılır.
# ---------------------------------------------------------------------------
set(CPACK_PACKAGE_NAME "localde-calisiyordu")
set(CPACK_PACKAGE_VENDOR "LocaldeCalisiyordu")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_CONTACT "support@localdecalisiyordu.example")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Yerel kod paylasimi ve proje editoru masaustu uygulamasi")
set(CPACK_PACKAGE_EXECUTABLES "localde-desktop" "Localde Calisiyordu")

if(WIN32)
    set(CPACK_GENERATOR "NSIS")
    set(CPACK_PACKAGE_INSTALL_DIRECTORY "LocaldeCalisiyordu")
    set(CPACK_NSIS_PACKAGE_NAME "Localde Calisiyordu")
    set(CPACK_NSIS_DISPLAY_NAME "Localde Calisiyordu")
    set(CPACK_NSIS_MUI_ICON "${CMAKE_SOURCE_DIR}/packaging/windows/app-icon.ico")
    set(CPACK_NSIS_MUI_UNIICON "${CMAKE_SOURCE_DIR}/packaging/windows/app-icon.ico")
    set(CPACK_NSIS_EXECUTABLES_DIRECTORY ".")
    set(CPACK_NSIS_CREATE_ICONS_EXTRA
        "CreateShortCut '$SMPROGRAMS\\\\$STARTMENU_FOLDER\\\\Localde Calisiyordu.lnk' '$INSTDIR\\\\localde-desktop.exe'")
    set(CPACK_NSIS_MODIFY_PATH OFF)
elseif(NOT APPLE)
    set(CPACK_GENERATOR "DEB")
    set(CPACK_DEBIAN_PACKAGE_MAINTAINER "LocaldeCalisiyordu")
    set(CPACK_DEBIAN_PACKAGE_SECTION "devel")
    set(CPACK_DEBIAN_PACKAGE_DEPENDS "libqt6core6, libqt6widgets6, libqt6sql6-sqlite, libqt6gui6, libsodium23")
    set(CPACK_DEBIAN_PACKAGE_HOMEPAGE "https://example.com/localde-calisiyordu")
    set(CPACK_DEBIAN_FILE_NAME DEB-DEFAULT)
endif()

include(CPack)
