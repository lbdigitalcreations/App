import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { clearTokens, getToken, mobileFetch, saveTokens } from './src/lib/api';

type Screen =
  | 'Splash'
  | 'Onboarding'
  | 'Login'
  | 'Registration'
  | 'Home'
  | 'Services'
  | 'Templates'
  | 'TemplatePreview'
  | 'MomentsStudio'
  | 'OrderCreation'
  | 'Payment'
  | 'MyOrders'
  | 'ProjectTracking'
  | 'RevisionRequests'
  | 'Notifications'
  | 'Profile'
  | 'Support';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Splash');
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [honorees, setHonorees] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [uploadedAssetIds, setUploadedAssetIds] = useState<string[]>([]);
  const [upiRef, setUpiRef] = useState('');
  const [revSection, setRevSection] = useState('Hero & Title');
  const [revDesc, setRevDesc] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMsg, setSupportMsg] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [svcs, tpls, pkgs] = await Promise.all([
          mobileFetch('/catalog/services', { cacheKey: 'services' }),
          mobileFetch('/catalog/templates', { cacheKey: 'templates' }),
          mobileFetch('/catalog/packages', { cacheKey: 'packages' }),
        ]);
        setServices(svcs);
        setTemplates(tpls);
        setPackages(pkgs);

        const token = await getToken();
        if (token) {
          const me = await mobileFetch('/auth/me', { auth: true });
          setUser(me);
          setScreen('Home');
          registerPushToken();
        } else {
          setScreen('Onboarding');
        }
      } catch {
        setScreen('Onboarding');
      }
    };
    init();

    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.path?.includes('orders')) setScreen('MyOrders');
    });
    return () => sub.remove();
  }, []);

  const registerPushToken = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await mobileFetch('/auth/me', {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify({ fcmToken: tokenData.data }),
        });
      }
    } catch {}
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await mobileFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await saveTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      setScreen('Home');
    } catch (e: any) {
      Alert.alert('Login Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await mobileFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, phone: phone || undefined, password }),
      });
      await saveTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      setScreen('Home');
    } catch (e: any) {
      Alert.alert('Registration Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'photo.jpg',
      type: asset.mimeType || 'image/jpeg',
    } as any);
    try {
      const uploaded = await mobileFetch('/media/upload?category=PHOTO', {
        method: 'POST',
        auth: true,
        body: form,
      });
      setUploadedAssetIds((prev) => [...prev, uploaded.id]);
      Alert.alert('Uploaded', 'Photo attached to Moments Studio.');
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    }
  };

  const submitOrder = async () => {
    if (!services[0] || !templates[0] || !packages[0]) return;
    const tpl = selectedTemplate || templates[0];
    try {
      const res = await mobileFetch('/orders', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          serviceId: tpl.serviceId,
          templateId: tpl.id,
          packageId: packages[0].id,
          selectedAddOnIds: [],
          customerName: user?.profile?.fullName || fullName || 'LBDC Customer',
          customerEmail: user?.email || email,
          customerPhone: user?.phone || phone || '+919876543210',
          customization: {
            serviceId: tpl.serviceId,
            templateId: tpl.id,
            celebrationTitle: title,
            honoreeNames: honorees,
            eventDate,
            venueName: venue,
            photoAssetIds: uploadedAssetIds,
            videoAssetIds: [],
          },
        }),
      });
      setSelectedOrder(res.order);
      setScreen('Payment');
    } catch (e: any) {
      Alert.alert('Order Error', e.message);
    }
  };

  const loadOrders = async () => {
    const list = await mobileFetch('/orders', { auth: true, cacheKey: 'my_orders' });
    setOrders(list);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {screen === 'Splash' && (
          <View style={styles.center}>
            <Text style={styles.brand}>LB Digital Creations</Text>
            <ActivityIndicator color="#C5A15A" style={{ marginTop: 16 }} />
          </View>
        )}

        {screen === 'Onboarding' && (
          <View style={styles.card}>
            <Text style={styles.brand}>LB Digital Creations</Text>
            <Text style={styles.subtitle}>Creating Websites for Your Special Moments</Text>
            <Text style={styles.body}>
              Craft bespoke celebration websites for weddings, birthdays & milestones with 50%
              advance and unlimited preview revisions.
            </Text>
            <TouchableOpacity style={styles.goldBtn} onPress={() => setScreen('Login')}>
              <Text style={styles.goldBtnText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setScreen('Registration')}>
              <Text style={styles.outlineBtnText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => setScreen('Home')}>
              <Text style={styles.linkText}>Explore as Guest</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'Login' && (
          <View style={styles.card}>
            <Text style={styles.title}>Sign In</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.goldBtn} onPress={handleLogin} disabled={loading}>
              <Text style={styles.goldBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => setScreen('Registration')}>
              <Text style={styles.linkText}>New user? Create account</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'Registration' && (
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Phone (+91...)" value={phone} onChangeText={setPhone} />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.goldBtn} onPress={handleRegister}>
              <Text style={styles.goldBtnText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => setScreen('Login')}>
              <Text style={styles.linkText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'Home' && (
          <View style={{ gap: 12 }}>
            <Text style={styles.brand}>LB Digital Creations</Text>
            <Text style={styles.subtitle}>Welcome{user ? `, ${user.profile?.fullName}` : ''}</Text>
            <View style={styles.grid}>
              {(
                [
                  ['Services', 'Services'],
                  ['Templates', 'Templates'],
                  ['Moments Studio', 'MomentsStudio'],
                  ['My Orders', 'MyOrders'],
                  ['Notifications', 'Notifications'],
                  ['Profile', 'Profile'],
                  ['Support', 'Support'],
                ] as Array<[string, Screen]>
              ).map(([label, target]) => (
                <TouchableOpacity
                  key={target}
                  style={styles.navTile}
                  onPress={async () => {
                    if (target === 'MyOrders') await loadOrders();
                    if (target === 'Notifications') {
                      setNotifications(await mobileFetch('/notifications', { auth: true }));
                    }
                    setScreen(target);
                  }}
                >
                  <Text style={styles.navTileText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {screen === 'Services' && (
          <View style={{ gap: 10 }}>
            <Text style={styles.title}>Celebration Categories</Text>
            {services.map((s) => (
              <View key={s.id} style={styles.card}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.body}>{s.description}</Text>
                <Text style={styles.goldText}>From ₹{s.basePrice}</Text>
              </View>
            ))}
          </View>
        )}

        {screen === 'Templates' && (
          <View style={{ gap: 10 }}>
            <Text style={styles.title}>Template Library</Text>
            {templates.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                onPress={() => {
                  setSelectedTemplate(t);
                  setScreen('TemplatePreview');
                }}
              >
                <Text style={styles.cardTitle}>{t.name}</Text>
                <Text style={styles.body}>{t.tagline}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {screen === 'TemplatePreview' && selectedTemplate && (
          <View style={styles.card}>
            <Text style={styles.title}>{selectedTemplate.name}</Text>
            <Text style={styles.body}>{selectedTemplate.description}</Text>
            <TouchableOpacity style={styles.goldBtn} onPress={() => setScreen('MomentsStudio')}>
              <Text style={styles.goldBtnText}>Customize in Moments Studio</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'MomentsStudio' && (
          <View style={styles.card}>
            <Text style={styles.title}>Moments Studio</Text>
            <TextInput style={styles.input} placeholder="Celebration Title" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Honoree Names" value={honorees} onChangeText={setHonorees} />
            <TextInput style={styles.input} placeholder="Event Date (YYYY-MM-DD)" value={eventDate} onChangeText={setEventDate} />
            <TextInput style={styles.input} placeholder="Venue Name" value={venue} onChangeText={setVenue} />
            <TouchableOpacity style={styles.outlineBtn} onPress={pickAndUploadImage}>
              <Text style={styles.outlineBtnText}>Pick & Upload Photo ({uploadedAssetIds.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.goldBtn} onPress={() => setScreen('OrderCreation')}>
              <Text style={styles.goldBtnText}>Continue to Order Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'OrderCreation' && (
          <View style={styles.card}>
            <Text style={styles.title}>Confirm Order</Text>
            <Text style={styles.body}>Celebration: {title}</Text>
            <Text style={styles.body}>Honorees: {honorees}</Text>
            <Text style={styles.body}>50% Advance Policy Applies</Text>
            <TouchableOpacity style={styles.goldBtn} onPress={submitOrder}>
              <Text style={styles.goldBtnText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'Payment' && selectedOrder && (
          <View style={styles.card}>
            <Text style={styles.title}>50% Advance Payment</Text>
            <Text style={styles.body}>Order: {selectedOrder.orderNumber}</Text>
            <Text style={styles.goldText}>Advance Due: ₹{selectedOrder.advanceAmount}</Text>
            <TextInput style={styles.input} placeholder="UPI UTR / Reference ID" value={upiRef} onChangeText={setUpiRef} />
            <TouchableOpacity
              style={styles.goldBtn}
              onPress={async () => {
                await mobileFetch('/payments/manual-upi', {
                  method: 'POST',
                  auth: true,
                  body: JSON.stringify({
                    orderId: selectedOrder.id,
                    paymentType: 'ADVANCE',
                    upiReferenceId: upiRef,
                  }),
                });
                Alert.alert('Submitted', 'Payment submitted for admin verification.');
                setScreen('MyOrders');
              }}
            >
              <Text style={styles.goldBtnText}>Submit Manual UPI</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'MyOrders' && (
          <View style={{ gap: 10 }}>
            <Text style={styles.title}>My Orders</Text>
            {orders.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={styles.card}
                onPress={() => {
                  setSelectedOrder(o);
                  setScreen('ProjectTracking');
                }}
              >
                <Text style={styles.goldText}>{o.orderNumber}</Text>
                <Text style={styles.cardTitle}>{o.requirements?.celebrationTitle}</Text>
                <Text style={styles.body}>Status: {o.project?.status || o.orderStatus}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {screen === 'ProjectTracking' && selectedOrder && (
          <View style={styles.card}>
            <Text style={styles.title}>Project Tracking</Text>
            <Text style={styles.body}>Ref: {selectedOrder.project?.referenceNumber}</Text>
            <Text style={styles.goldText}>Status: {selectedOrder.project?.status}</Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setScreen('RevisionRequests')}>
              <Text style={styles.outlineBtnText}>Request Revision</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'RevisionRequests' && selectedOrder?.project && (
          <View style={styles.card}>
            <Text style={styles.title}>Request Revision</Text>
            <TextInput style={styles.input} placeholder="Section" value={revSection} onChangeText={setRevSection} />
            <TextInput style={styles.input} placeholder="Describe changes..." value={revDesc} onChangeText={setRevDesc} multiline />
            <TouchableOpacity
              style={styles.goldBtn}
              onPress={async () => {
                await mobileFetch(`/projects/${selectedOrder.project.id}/revisions`, {
                  method: 'POST',
                  auth: true,
                  body: JSON.stringify({ section: revSection, description: revDesc, referenceAssetIds: [] }),
                });
                Alert.alert('Sent', 'Revision request submitted!');
                setScreen('MyOrders');
              }}
            >
              <Text style={styles.goldBtnText}>Submit Revision</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'Notifications' && (
          <View style={{ gap: 10 }}>
            <Text style={styles.title}>Notifications</Text>
            {notifications.map((n) => (
              <View key={n.id} style={styles.card}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
              </View>
            ))}
          </View>
        )}

        {screen === 'Profile' && (
          <View style={styles.card}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.body}>{user?.profile?.fullName}</Text>
            <Text style={styles.body}>{user?.email}</Text>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={async () => {
                await clearTokens();
                setUser(null);
                setScreen('Onboarding');
              }}
            >
              <Text style={styles.outlineBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'Support' && (
          <View style={styles.card}>
            <Text style={styles.title}>Customer Support</Text>
            <TextInput style={styles.input} placeholder="Subject" value={supportSubject} onChangeText={setSupportSubject} />
            <TextInput style={styles.input} placeholder="Message" value={supportMsg} onChangeText={setSupportMsg} multiline />
            <TouchableOpacity
              style={styles.goldBtn}
              onPress={async () => {
                await mobileFetch('/orders/support/tickets', {
                  method: 'POST',
                  auth: true,
                  body: JSON.stringify({ subject: supportSubject, message: supportMsg }),
                });
                Alert.alert('Submitted', 'Support ticket created.');
                setScreen('Home');
              }}
            >
              <Text style={styles.goldBtnText}>Send Ticket</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen !== 'Splash' && screen !== 'Onboarding' && screen !== 'Home' && (
          <TouchableOpacity style={styles.linkBtn} onPress={() => setScreen('Home')}>
            <Text style={styles.linkText}>← Back to Home</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },
  scroll: { padding: 20, gap: 14 },
  center: { paddingVertical: 120, alignItems: 'center' },
  brand: { fontSize: 26, fontWeight: '700', color: '#202020' },
  title: { fontSize: 22, fontWeight: '700', color: '#202020', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#C5A15A', fontWeight: '600', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#202020' },
  body: { fontSize: 13, color: '#777777', lineHeight: 20, marginVertical: 4 },
  goldText: { fontSize: 13, fontWeight: '700', color: '#C5A15A', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE6DD',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  input: {
    backgroundColor: '#F8F7F4',
    borderColor: '#EAE6DD',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  goldBtn: {
    backgroundColor: '#C5A15A',
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  goldBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    borderColor: '#C5A15A',
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  outlineBtnText: { color: '#202020', fontWeight: '600', fontSize: 14 },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#C5A15A', fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  navTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE6DD',
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  navTileText: { fontSize: 14, fontWeight: '700', color: '#202020' },
});
