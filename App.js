/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  View,
  FlatList,
  Platform,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  MediaStream,
  RTCView,
  createCameraVideoTrack,
} from '@videosdk.live/react-native-sdk';
import {createMeeting, token} from './api';

const {ForegroundServiceModule} = NativeModules;

// Request runtime permissions for Android
const requestPermissions = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    console.log('Requesting runtime permissions...');

    const permissions = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(granted).every(
      permission => permission === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (allGranted) {
      console.log('All permissions granted');
      return true;
    } else {
      console.log('Some permissions denied:', granted);
      return false;
    }
  } catch (err) {
    console.error('Error requesting permissions:', err);
    return false;
  }
};

function JoinScreen(props) {
  const [meetingVal, setMeetingVal] = useState('');
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#F6F6FF',
        justifyContent: 'center',
        paddingHorizontal: 6 * 10,
      }}>
      <TouchableOpacity
        onPress={() => {
          props.getMeetingId();
        }}
        style={{backgroundColor: '#1178F8', padding: 12, borderRadius: 6}}>
        <Text style={{color: 'white', alignSelf: 'center', fontSize: 18}}>
          Create Meeting
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          alignSelf: 'center',
          fontSize: 22,
          marginVertical: 16,
          fontStyle: 'italic',
          color: 'grey',
        }}>
        ---------- OR ----------
      </Text>
      <TextInput
        value={meetingVal}
        onChangeText={setMeetingVal}
        placeholder={'XXXX-XXXX-XXXX'}
        style={{
          padding: 12,
          borderWidth: 1,
          borderRadius: 6,
          fontStyle: 'italic',
        }}
      />
      <TouchableOpacity
        style={{
          backgroundColor: '#1178F8',
          padding: 12,
          marginTop: 14,
          borderRadius: 6,
        }}
        onPress={() => {
          console.log('dmeo user ');
          props.getMeetingId(meetingVal);
        }}>
        <Text style={{color: 'white', alignSelf: 'center', fontSize: 18}}>
          Join Meeting
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const Button = ({onPress, buttonText, backgroundColor}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 4,
      }}>
      <Text style={{color: 'white', fontSize: 12}}>{buttonText}</Text>
    </TouchableOpacity>
  );
};

function ControlsContainer({
  join,
  leave,
  toggleWebcam,
  toggleMic,
  toggleScreenShare,
}) {
  return (
    <View
      style={{
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
      <Button
        onPress={() => {
          join();
        }}
        buttonText={'Join'}
        backgroundColor={'#1178F8'}
      />
      <Button
        onPress={() => {
          toggleWebcam();
        }}
        buttonText={'Toggle Webcam'}
        backgroundColor={'#1178F8'}
      />
      <Button
        onPress={() => {
          toggleMic();
        }}
        buttonText={'Toggle Mic'}
        backgroundColor={'#1178F8'}
      />
      <Button
        onPress={() => {
          leave();
        }}
        buttonText={'Leave'}
        backgroundColor={'#FF0000'}
      />
      <Button
        onPress={() => {
          toggleScreenShare();
        }}
        buttonText={'Screen Share'}
        backgroundColor={'#FF0000'}
      />
    </View>
  );
}
function ParticipantView({participantId}) {
  const {webcamStream, webcamOn} = useParticipant(participantId);
  return webcamOn && webcamStream ? (
    <RTCView
      streamURL={new MediaStream([webcamStream.track]).toURL()}
      objectFit={'cover'}
      style={{
        height: 300,
        marginVertical: 8,
        marginHorizontal: 8,
      }}
    />
  ) : (
    <View
      style={{
        backgroundColor: 'grey',
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 8,
        marginHorizontal: 8,
      }}>
      <Text style={{fontSize: 16}}>NO MEDIA</Text>
    </View>
  );
}

function ParticipantList({participants}) {
  return participants.length > 0 ? (
    <FlatList
      data={participants}
      renderItem={({item}) => {
        return <ParticipantView participantId={item} />;
      }}
    />
  ) : (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F6F6FF',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text style={{fontSize: 20}}>Press Join button to enter meeting.</Text>
    </View>
  );
}

function MeetingView() {
  // Get `participants` from useMeeting Hook
  const {
    join,
    leave,
    toggleWebcam,
    toggleMic,
    participants,
    meetingId,
    toggleScreenShare,
  } = useMeeting({
    onMeetingJoined: async () => {
      if (Platform.OS === 'android' && ForegroundServiceModule) {
        try {
          const hasPermissions = await requestPermissions();

          if (hasPermissions) {
            setTimeout(async () => {
              await ForegroundServiceModule.startService();
            }, 1000);
          }
        } catch (e) {
          console.error('Failed to start foreground service:', e);
        }
      }
    },
    onMeetingLeft: async () => {
      if (Platform.OS === 'android' && ForegroundServiceModule) {
        try {
          await ForegroundServiceModule.stopService();
          console.log('Foreground service stopped on meeting left');
        } catch (e) {
          console.error('Failed to stop foreground service:', e);
        }
      }
    },
  });
  const participantsArrId = [...participants.keys()];

  return (
    <View style={{flex: 1}}>
      {meetingId ? (
        <Text style={{fontSize: 18, padding: 12}}>Meeting Id :{meetingId}</Text>
      ) : null}
      <ParticipantList participants={participantsArrId} />
      <ControlsContainer
        join={join}
        leave={leave}
        toggleWebcam={toggleWebcam}
        toggleMic={toggleMic}
        toggleScreenShare={toggleScreenShare}
      />
    </View>
  );
}

export default function App() {
  const [meetingId, setMeetingId] = useState(null);
  const [customTrack, setCustomTrack] = useState(null);

  useEffect(() => {
    const videoTrack = async () => {
      try {
        const track = await createCameraVideoTrack({
          encoderConfig: 'h540p_w960p',
          multiStream: false,
          facingMode: 'environment',
        });
        console.log('tarck', track);
        setCustomTrack(track);
      } catch (e) {
        console.error('Error creating custom track:', e);
      }
    };
    videoTrack();
  }, []);

  const getMeetingId = async id => {
    if (!token) {
      console.log('PLEASE PROVIDE TOKEN IN api.js FROM app.videosdk.live');
    }
    const m = id == null ? await createMeeting({token}) : id;
    setMeetingId(m);
  };

  return meetingId ? (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F6F6FF'}}>
      <MeetingProvider
        config={{
          meetingId,
          micEnabled: false,
          webcamEnabled: true,
          name: 'Test User',
          customCameraVideoTrack: customTrack,
          multiStream: false,
        }}
        token={token}>
        <MeetingView />
      </MeetingProvider>
    </SafeAreaView>
  ) : (
    <JoinScreen
      getMeetingId={() => {
        getMeetingId();
      }}
    />
  );
}
