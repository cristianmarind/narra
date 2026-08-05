import { Modal, Pressable, StyleSheet } from "react-native";

import { AppSidebar } from "@/components/app-sidebar";
import { Layout } from "@/constants/theme";

interface NavDrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenAdsInfo?: () => void;
}

/**
 * Mobile-only slide-over that hosts the sidebar.
 * On `md` and up the sidebar is rendered persistently instead and this is unused.
 */
export function NavDrawer({ visible, onClose, onOpenSettings, onOpenAdsInfo }: NavDrawerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Cerrar menú">
        {/* Swallow presses inside the panel so they don't dismiss the drawer */}
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <AppSidebar
            onOpenSettings={onOpenSettings}
            onOpenAdsInfo={onOpenAdsInfo}
            onNavigate={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panel: {
    width: Layout.drawerWidth,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
