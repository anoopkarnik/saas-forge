import { useRef, useCallback, useState, useMemo } from "react";
import {
    View,
    TouchableOpacity,
    Linking,
} from "react-native";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Label, MutedText } from "@/components/common";
import MessageForm from "./MessageForm";

type ActivePanel = "message" | null;

const Support = () => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);

    const showSupportMail = !!process.env.EXPO_PUBLIC_SUPPORT_MAIL;
    const calendlyUrl = process.env.EXPO_PUBLIC_CALENDLY_BOOKING_URL;

    const snapPoints = useMemo(() => ["50%", "75%"], []);

    const handleOpen = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(0);
    }, []);

    const handleClose = useCallback(() => {
        setActivePanel(null);
        bottomSheetRef.current?.close();
    }, []);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            setActivePanel(null);
        }
    }, []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    return (
        <>
            {/* Floating Action Button */}
            <TouchableOpacity
                className="absolute bottom-20 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-xl z-30"
                activeOpacity={0.8}
                onPress={handleOpen}
                style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <MutedText className="text-2xl text-primary-foreground">?</MutedText>
            </TouchableOpacity>

            {/* Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                onChange={handleSheetChange}
                backdropComponent={renderBackdrop}
                enablePanDownToClose
                backgroundStyle={{
                    backgroundColor: "hsl(240, 6%, 10%)",
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                }}
                handleIndicatorStyle={{
                    backgroundColor: "hsla(0, 0%, 98%, 0.3)",
                    width: 40,
                }}
                handleStyle={{
                    paddingTop: 12,
                    paddingBottom: 8,
                }}
            >
                <BottomSheetScrollView
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                >
                    {!activePanel ? (
                        <View className="gap-4">
                            <Label className="text-lg text-center mb-2 text-white">
                                How can we help?
                            </Label>

                            {/* Support Cards Grid */}
                            <View className="gap-3">
                                {showSupportMail && (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => setActivePanel("message")}
                                        className="flex-row items-center gap-4 p-4 rounded-2xl"
                                        style={{
                                            backgroundColor: "hsla(240, 6%, 15%, 0.8)",
                                            borderWidth: 1,
                                            borderColor: "hsla(30, 100%, 50%, 0.2)",
                                        }}
                                    >
                                        <View
                                            className="w-12 h-12 rounded-xl items-center justify-center"
                                            style={{ backgroundColor: "hsla(30, 100%, 50%, 0.12)" }}
                                        >
                                            <MutedText className="text-2xl">✉️</MutedText>
                                        </View>
                                        <View className="flex-1">
                                            <Label className="text-base text-white">Send Message</Label>
                                            <MutedText className="text-xs mt-0.5">
                                                Drop us a message and we'll respond shortly
                                            </MutedText>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {calendlyUrl && (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => Linking.openURL(calendlyUrl)}
                                        className="flex-row items-center gap-4 p-4 rounded-2xl"
                                        style={{
                                            backgroundColor: "hsla(240, 6%, 15%, 0.8)",
                                            borderWidth: 1,
                                            borderColor: "hsla(180, 100%, 50%, 0.2)",
                                        }}
                                    >
                                        <View
                                            className="w-12 h-12 rounded-xl items-center justify-center"
                                            style={{ backgroundColor: "hsla(180, 100%, 50%, 0.12)" }}
                                        >
                                            <MutedText className="text-2xl">📅</MutedText>
                                        </View>
                                        <View className="flex-1">
                                            <Label className="text-base text-white">Book Meeting</Label>
                                            <MutedText className="text-xs mt-0.5">
                                                Schedule a call via Calendly
                                            </MutedText>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        <MessageForm onClose={handleClose} />
                    )}
                </BottomSheetScrollView>
            </BottomSheet>
        </>
    );
};

export default Support;
